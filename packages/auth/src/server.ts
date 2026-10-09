import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { setCookieCache } from "better-auth/cookies";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { admin, genericOAuth, type UserWithRole } from "better-auth/plugins";

import { claimInitialAdmin, isRegistrationOpen } from "@sofa/core/settings";
import { db } from "@sofa/db/client";
import { createLogger } from "@sofa/logger";

import { isOidcAutoRegisterEnabled, isOidcConfigured, isPasswordLoginDisabled } from "./config";

const authLog = createLogger("auth");

const httpsVariant = process.env.BETTER_AUTH_URL?.replace(/^http:/, "https:");
export const auth = betterAuth({
  trustedOrigins: ["sofa://", ...(httpsVariant ? [httpsVariant] : [])],
  logger: {
    // Suppress unset secret/low entropy warnings during build
    disabled: process.env.NEXT_PHASE === "phase-production-build",
    level: "debug",
    log: (level, message, ...args) => {
      const fn = authLog[level as keyof typeof authLog];
      if (fn) fn(message, ...args);
    },
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: !isPasswordLoginDisabled(),
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["oidc"],
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "jwt",
    },
  },
  plugins: [
    admin(),
    ...(isOidcConfigured()
      ? [
          genericOAuth({
            config: [
              {
                providerId: "oidc",
                clientId: process.env.OIDC_CLIENT_ID ?? "",
                clientSecret: process.env.OIDC_CLIENT_SECRET ?? "",
                discoveryUrl: `${process.env.OIDC_ISSUER_URL}/.well-known/openid-configuration`,
                scopes: ["openid", "email", "profile"],
                pkce: true,
                disableImplicitSignUp: !isOidcAutoRegisterEnabled(),
                mapProfileToUser: (profile) => ({
                  name: profile.name || profile.preferred_username || profile.email,
                }),
              },
            ],
          }),
        ]
      : []),
    expo(),
  ],
  advanced: {
    database: {
      generateId: () => Bun.randomUUIDv7(),
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Block email/password sign-up when registration is closed.
      // This is endpoint-level so it doesn't affect OIDC user creation
      // (which is gated by the genericOAuth plugin's disableImplicitSignUp).
      if (ctx.path === "/sign-up/email") {
        const open = isRegistrationOpen();
        if (!open) {
          throw new APIError("FORBIDDEN", {
            message: "Registration is currently closed",
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // The first user is promoted to admin by a create.after database hook, which
      // Better Auth runs after the sign-up transaction commits — i.e. after the
      // session cookie (including its cached user) was already written with
      // role "user". Re-read the user and refresh the cache cookie if it changed.
      const newSession = ctx.context.newSession;
      if (!newSession) return;
      try {
        const fresh = (await ctx.context.internalAdapter.findUserById(
          newSession.user.id,
        )) as UserWithRole | null;
        const cachedRole = (newSession.user as UserWithRole).role;
        if (!fresh || fresh.role === cachedRole) return;
        const user = { ...newSession.user, role: fresh.role };
        await setCookieCache(ctx, { session: newSession.session, user }, false);
      } catch (err) {
        // Never turn a successful sign-in into an error over a cache refresh.
        authLog.warn("Failed to refresh session cookie cache:", err);
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Promote exactly one bootstrap user to admin, even if multiple
          // sign-ups race during the first-run window.
          claimInitialAdmin(user.id);
        },
      },
    },
  },
} satisfies BetterAuthOptions);

export type Session = typeof auth.$Infer.Session;
