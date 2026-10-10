import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [adminClient(), genericOAuthClient()],
});

export const { signIn, signUp, useSession } = authClient;

// Route guards call getSession() on every navigation, and each call is a network
// round trip. Remember a signed-in session briefly so navigation doesn't wait on it.
// The server still checks the session on every API request, so this only affects
// which screen is shown, never what data is returned.
const SESSION_TTL_MS = 60_000;
let cachedSession: { at: number; value: Awaited<ReturnType<typeof authClient.getSession>> } | null =
  null;

export async function getSessionCached() {
  if (cachedSession && Date.now() - cachedSession.at < SESSION_TTL_MS) return cachedSession.value;
  const value = await authClient.getSession();
  // Never cache "signed out", so a fresh sign-in is picked up immediately.
  cachedSession = value.data ? { at: Date.now(), value } : null;
  return value;
}

export function clearSessionCache() {
  cachedSession = null;
}

export const signOut: typeof authClient.signOut = (...args) => {
  clearSessionCache();
  return authClient.signOut(...args);
};
