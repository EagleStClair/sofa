import { useLingui } from "@lingui/react/macro";
import { IconHistory } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

import { FeedSection } from "./feed-section";
import { TitleGrid, TitleGridSectionSkeleton } from "./title-grid";

export function RecentlyWatchedSection() {
  const { data, isPending } = useQuery(
    orpc.library.recentlyWatched.queryOptions({ input: { limit: 10 } }),
  );

  const { t } = useLingui();

  if (isPending) return <TitleGridSectionSkeleton />;

  const items = data ?? [];
  if (items.length === 0) return null;

  return (
    <FeedSection title={t`Recently Watched`} icon={<IconHistory className="text-primary size-5" />}>
      <TitleGrid items={items} />
    </FeedSection>
  );
}