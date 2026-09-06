import { createFileRoute } from "@tanstack/react-router";

import { ContinueWatchingSectionSkeleton } from "@/components/dashboard/continue-watching-list";
import { ContinueWatchingSection } from "@/components/dashboard/continue-watching-section";
import { RecentlyWatchedSection } from "@/components/dashboard/recently-watched-section";
import { StatsSectionSkeleton } from "@/components/dashboard/stats-display";
import { StatsSection } from "@/components/dashboard/stats-section";
import { TitleGridSectionSkeleton } from "@/components/dashboard/title-grid";
import { UpcomingSection } from "@/components/dashboard/upcoming-section";
import { RouteError } from "@/components/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/_app/dashboard")({
  staleTime: 30_000,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        orpc.tracking.stats.queryOptions({ input: { type: "movie", period: "this_month" } }),
      ),
      context.queryClient.ensureQueryData(
        orpc.tracking.stats.queryOptions({ input: { type: "episode", period: "this_week" } }),
      ),
      context.queryClient.ensureQueryData(orpc.library.continueWatching.queryOptions()),
      context.queryClient.ensureQueryData(
        orpc.library.upcoming.queryOptions({ input: { days: 7, limit: 5 } }),
      ),
      context.queryClient.ensureQueryData(
        orpc.library.recentlyWatched.queryOptions({ input: { limit: 10 } }),
      ),
    ]);
  },
  head: () => ({ meta: [{ title: "Dashboard — Sofa" }] }),
  pendingComponent: DashboardSkeleton,
  errorComponent: RouteError,
  component: DashboardPage,
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <StatsSectionSkeleton />
      <ContinueWatchingSectionSkeleton />
      <TitleGridSectionSkeleton />
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="space-y-6">
      <StatsSection />
      <ContinueWatchingSection />
      <UpcomingSection />
      <RecentlyWatchedSection />
    </div>
  );
}