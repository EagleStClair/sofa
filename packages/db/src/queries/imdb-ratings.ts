import { eq, isNotNull } from "drizzle-orm";
import { db } from "../client";
import { titles } from "../schema";

export function getImdbIdsInDb(): string[] {
  return db.select({ imdbId: titles.imdbId }).from(titles).where(isNotNull(titles.imdbId)).all()
    .map((r) => r.imdbId as string);
}

export function updateImdbRating(imdbId: string, rating: number) {
  db.update(titles).set({ imdbRating: rating }).where(eq(titles.imdbId, imdbId)).run();
}