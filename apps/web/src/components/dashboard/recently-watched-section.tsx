import { useLingui } from "@lingui/react/macro";
import { IconHistory } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

import { FeedSection } from "./feed-section";
import { RecentlyWatchedRow } from "./recently-watched-item";

export function RecentlyWatchedSection() {
  const { data, isPending } = useQuery(
    orpc.library.recentlyWatched.queryOptions({ input: { limit: 10 } }),
  );

  const { t } = useLingui();

  if (isPending) return null;

  const items = data ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection title={t`Recently Watched`} icon={<IconHistory className="text-primary size-5" />}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <RecentlyWatchedRow key={`${item.titleId}-${item.episodeId}-${i}`} item={item} />
        ))}
      </div>
    </FeedSection>
  );
}