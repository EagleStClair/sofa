import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today means "right now"; any earlier day is recorded at noon local time. */
function dateFromInput(value: string): Date {
  if (value === toDateInputValue(new Date())) return new Date();
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function WatchDateForm({
  title,
  onConfirm,
}: {
  title: string;
  onConfirm: (watchedAt: Date) => void;
}) {
  const { t } = useLingui();
  const today = toDateInputValue(new Date());
  const [value, setValue] = useState(today);
  const valid = value !== "" && value <= today;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t`Watched on…`}</DialogTitle>
        <DialogDescription>{title}</DialogDescription>
      </DialogHeader>
      <Input
        type="date"
        value={value}
        max={today}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t`Date watched`}
        className="h-9 text-base"
      />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          <Trans>Cancel</Trans>
        </DialogClose>
        <Button disabled={!valid} onClick={() => onConfirm(dateFromInput(value))}>
          <Trans>Mark watched</Trans>
        </Button>
      </DialogFooter>
    </>
  );
}

/** Pick the day something was watched. The form resets every time the dialog opens. */
export function WatchDateDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: (watchedAt: Date) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        {open && (
          <WatchDateForm
            title={title}
            onConfirm={(watchedAt) => {
              onConfirm(watchedAt);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
