import { Trans, useLingui } from "@lingui/react/macro";
import { IconCalendarPlus, IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WatchDateDialog } from "@/components/watch-date-dialog";
import { useLongPress } from "@/hooks/use-long-press";

import { StarRating } from "./star-rating";
import { StatusButton } from "./status-button";
import { useTitleContext, useTitleUserInfo } from "./title-context";
import { useTitleActions } from "./use-title-actions";

export function TitleActions() {
  const { t } = useLingui();
  const { titleType, titleName } = useTitleContext();
  const { userStatus, userRating } = useTitleUserInfo();
  const { handleStatusChange, handleRating, handleWatchMovie, handleUnwatchMovie } =
    useTitleActions();
  const isMovieWatched = userStatus === "completed";
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const longPress = useLongPress(() => {
    if (!isMovieWatched) setDateDialogOpen(true);
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusButton currentStatus={userStatus ?? null} onChange={handleStatusChange} />
      {titleType === "movie" && (
        <Button
          {...longPress.handlers}
          onClick={() => {
            if (longPress.consumeLongPress()) return;
            if (isMovieWatched) void handleUnwatchMovie();
            else void handleWatchMovie();
          }}
          variant={isMovieWatched ? "destructive" : "default"}
          size="lg"
          className={`h-9 rounded-lg px-4 text-sm hover:shadow-md active:scale-[0.97] ${isMovieWatched ? "hover:shadow-destructive/20" : "hover:shadow-primary/20"}`}
        >
          {isMovieWatched ? (
            <>
              <IconX aria-hidden={true} className="size-3.5" />
              <Trans>Mark Unwatched</Trans>
            </>
          ) : (
            <>
              <IconCheck aria-hidden={true} className="size-3.5" />
              <Trans>Mark Watched</Trans>
            </>
          )}
        </Button>
      )}
      {titleType === "movie" && !isMovieWatched && (
        <>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t`Watched on a date…`}
            onClick={() => setDateDialogOpen(true)}
          >
            <IconCalendarPlus aria-hidden={true} />
          </Button>
          <WatchDateDialog
            open={dateDialogOpen}
            onOpenChange={setDateDialogOpen}
            title={titleName}
            onConfirm={(watchedAt) => void handleWatchMovie(watchedAt)}
          />
        </>
      )}
      <Separator orientation="vertical" className="bg-border/50 mx-0.5 my-auto h-6" />
      <StarRating value={userRating ?? 0} onChange={handleRating} />
    </div>
  );
}
