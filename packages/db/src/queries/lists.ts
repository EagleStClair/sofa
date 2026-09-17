import { and, eq, inArray } from "drizzle-orm";

import { db } from "../client";
import { titles } from "../schema";

export function batchUpdateTvdbIds(updates: { titleId: string; tvdbId: number }[]): void {
  if (updates.length === 0) return;
  db.transaction((tx) => {
    for (const { titleId, tvdbId } of updates) {
      tx.update(titles).set({ tvdbId }).where(eq(titles.id, titleId)).run();
    }
  });
}
