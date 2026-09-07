import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { thumbHashToUrl } from "@/lib/thumbhash";
import { formatRelativeTime } from "@sofa/i18n/format";
import type { RecentlyWatchedItemSchema } from "@sofa/api/schemas";
import type { z } from "zod";

type RecentlyWatchedItem = z.infer<typeof RecentlyWatchedItemSchema>;

export function RecentlyWatchedRow({ item }: { item: RecentlyWatchedItem }) {
  const { t } = useLingui();

  const subtitle =
    item.titleType === "tv" && item.seasonNumber != null && item.episodeNumber != null
      ? [`S${item.seasonNumber}E${item.episodeNumber}`, item.episodeName].filter(Boolean).join(" \u00b7 ")
      : null;

  return (
    <Link
      to="/titles/$id"
      params={{ id: item.titleId }}
      className="group bg-card/40 hover:bg-card/60 hover:shadow-primary/5 hover:ring-primary/25 flex items-center gap-4 rounded-xl px-3 py-3 ring-1 ring-white/[0.06] transition-[background,box-shadow,ring-color] duration-200 hover:shadow-lg"
    >
      <div className="relative h-[66px] w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
        {item.posterPath ? (
          <img
            src={item.posterPath}
            alt=""
            className="size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
            loading="lazy"
            {...(item.posterThumbHash
              ? { style: { background: `url(${thumbHashToUrl(item.posterThumbHash)}) center/cover` } }
              : {})}
          />
        ) : (
          <div className="bg-muted flex size-full items-center justify-center">
            <IconMovie className="text-muted-foreground size-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium">{item.titleName}</span>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          {item.titleType === "movie" && <IconMovie className="size-3 shrink-0" />}
          {subtitle ? (
            <span className="truncate">{subtitle}</span>
          ) : (
            <span className="truncate">{formatRelativeTime(item.watchedAt)}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="text-muted-foreground text-xs">{formatRelativeTime(item.watchedAt)}</span>
        {item.episodeProgress && item.episodeProgress.watched > 0 && (
          <span className="text-muted-foreground/80 text-xs">
            {item.episodeProgress.watched}/
            {plural(item.episodeProgress.total, { one: "# episode", other: "# episodes" })}
          </span>
        )}
      </div>
    </Link>
  );
}