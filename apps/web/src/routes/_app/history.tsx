import { Trans, useLingui } from "@lingui/react/macro";
import { IconHistory } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { RecentlyWatchedRow } from "@/components/dashboard/recently-watched-item";
import { RouteError } from "@/components/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

const HISTORY_LIMIT = 50;
const historyOptions = () =>
  orpc.library.recentlyWatched.queryOptions({
    input: { limit: HISTORY_LIMIT },
  });

export const Route = createFileRoute("/_app/history")({
  staleTime: 60_000,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(historyOptions());
  },
  head: () => ({ meta: [{ title: "History — Sofa" }] }),
  pendingComponent: HistorySkeleton,
  errorComponent: RouteError,
  component: HistoryPage,
});

function HistorySkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 py-2">
          <Skeleton className="size-[52px] rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryPage() {
  const { t } = useLingui();
  const { data, isPending } = useQuery(historyOptions());

  if (isPending) return <HistorySkeleton />;
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{t`History`}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <Trans>Your {HISTORY_LIMIT} most recent watches.</Trans>
        </p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconHistory className="text-muted-foreground/40 size-12" />
          <p className="text-muted-foreground mt-4 text-sm">
            <Trans>Nothing watched yet.</Trans>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <RecentlyWatchedRow key={`${item.titleId}-${item.episodeId}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
