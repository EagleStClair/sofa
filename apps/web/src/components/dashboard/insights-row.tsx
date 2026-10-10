import { useLingui } from "@lingui/react/macro";
import { IconClockHour4 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";
import type { WatchInsights } from "@sofa/api/schemas";

type Totals = WatchInsights["allTime"];

function Cell({ minutes, count, muted }: { minutes: number; count: number; muted?: boolean }) {
  const { t } = useLingui();
  const hours = Math.round(minutes / 60);
  const duration =
    hours >= 48
      ? t`${Math.floor(hours / 24)} d ${hours % 24} h`
      : hours >= 1
        ? t`${hours} h`
        : t`${minutes} min`;
  return (
    <div className="min-w-0">
      <span
        className={`font-display text-xl tracking-tight tabular-nums ${muted ? "text-foreground/70" : "text-primary"}`}
      >
        {duration}
      </span>
      <span className="text-muted-foreground ms-1.5 text-xs tabular-nums">{count}×</span>
    </div>
  );
}

function ColumnHead({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
      {children}
    </span>
  );
}

export function InsightsRow() {
  const { t } = useLingui();
  const { data } = useQuery(orpc.library.insights.queryOptions());

  // Still loading, or nothing watched yet: render nothing rather than empty rows.
  if (!data || (data.allTime.movieCount === 0 && data.allTime.episodeCount === 0)) return null;

  const rows: { label: string; pick: (totals: Totals) => { minutes: number; count: number } }[] = [
    {
      label: t`Movies`,
      pick: (x) => ({ minutes: x.movieMinutes, count: x.movieCount }),
    },
    {
      label: t`Episodes`,
      pick: (x) => ({ minutes: x.episodeMinutes, count: x.episodeCount }),
    },
  ];

  return (
    <div
      className="animate-stagger-item border-border/30 bg-card/50 rounded-xl border p-4"
      style={{ "--stagger-index": 2 } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-md">
          <IconClockHour4 aria-hidden={true} className="text-primary size-[13px]" />
        </div>
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t`Watch time`}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr_1fr] items-baseline gap-x-4 gap-y-2">
        <span />
        <ColumnHead>{t`Last 30 days`}</ColumnHead>
        <ColumnHead>{t`All time`}</ColumnHead>
        {rows.map((row) => {
          const recent = row.pick(data.last30Days);
          const all = row.pick(data.allTime);
          return (
            <div key={row.label} className="contents">
              <span className="text-muted-foreground text-sm">{row.label}</span>
              <Cell minutes={recent.minutes} count={recent.count} />
              <Cell minutes={all.minutes} count={all.count} muted />
            </div>
          );
        })}
      </div>
    </div>
  );
}
