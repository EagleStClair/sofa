import { Trans, useLingui } from "@lingui/react/macro";
import { IconCalendarStats, IconCategory, IconClockHour4 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

function Insight({
  icon: Icon,
  color,
  bgColor,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-3 first:ps-0 last:pe-0 sm:px-4">
      <div className="flex items-center gap-2">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${bgColor}`}>
          <Icon aria-hidden={true} className={`size-[13px] ${color}`} />
        </div>
        <span className="text-muted-foreground truncate text-[10px] font-medium tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p className={`font-display mt-2 truncate text-xl tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function formatWatchTime(minutes: number) {
  const hours = Math.round(minutes / 60);
  return hours >= 1 ? <Trans>{hours} h</Trans> : <Trans>{minutes} min</Trans>;
}

export function InsightsRow() {
  const { i18n } = useLingui();
  const { data } = useQuery(orpc.library.insights.queryOptions());

  // Nothing watched yet, or still loading: render nothing rather than empty cards.
  if (!data || data.watchMinutes === 0) return null;

  // 2023-01-01 was a Sunday, so day index 0-6 maps straight onto Sunday-Saturday.
  const weekday =
    data.busiestWeekday === null
      ? null
      : new Intl.DateTimeFormat(i18n.locale, {
          weekday: "long",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2023, 0, 1 + data.busiestWeekday)));

  // One full-width card under the two stat cards keeps the dashboard grid symmetric.
  return (
    <div
      className="animate-stagger-item border-border/30 bg-card/50 divide-border/30 grid grid-cols-3 divide-x rounded-xl border p-4"
      style={{ "--stagger-index": 2 } as React.CSSProperties}
    >
      <Insight
        icon={IconClockHour4}
        color="text-primary"
        bgColor="bg-primary/10"
        label={<Trans>Watch time</Trans>}
        value={formatWatchTime(data.watchMinutes)}
      />
      <Insight
        icon={IconCategory}
        color="text-status-watching"
        bgColor="bg-status-watching/10"
        label={<Trans>Top genre</Trans>}
        value={data.topGenre ?? "–"}
      />
      <Insight
        icon={IconCalendarStats}
        color="text-primary"
        bgColor="bg-primary/10"
        label={<Trans>Busiest day</Trans>}
        value={weekday ?? "–"}
      />
    </div>
  );
}
