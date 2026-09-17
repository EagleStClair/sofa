import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { CommandPalette } from "@/components/command-palette";
import { MobileTabBar, NavBar } from "@/components/nav-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";
import { client } from "@/lib/orpc/client";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) throw redirect({ to: "/login" });

    return { session };
  },
  component: AppLayout,
  pendingComponent: AppShellSkeleton,
});

function AppLayout() {
  const { session } = Route.useRouteContext();
  return (
    <>
      <div className="relative z-0 min-h-screen overflow-x-clip pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <NavBar
          userName={session.user.name}
          userEmail={session.user.email}
          userImage={session.user.image || undefined}
          userRole={session.user.role || undefined}
        />
        {/* Ambient glow */}
        <div className="bg-primary/3 pointer-events-none fixed top-1/4 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[200px]" />
        <main
          id="main-content"
          className="relative mx-auto max-w-6xl py-6 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:ps-[max(1.5rem,env(safe-area-inset-left))] sm:pe-[max(1.5rem,env(safe-area-inset-right))]"
        >
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette />
    </>
  );
}

function AppShellSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="border-border/50 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="size-7 rounded" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
