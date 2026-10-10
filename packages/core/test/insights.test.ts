import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";

import { genres, titleGenres, titles, episodes } from "@sofa/db/schema";
import {
  clearAllTables,
  insertEpisodeWatch,
  insertMovieWatch,
  insertTitle,
  insertTvShow,
  insertUser,
  testDb,
} from "@sofa/test/db";

import { getWatchInsights } from "../src/discovery";

beforeEach(() => {
  clearAllTables();
});

function setRuntime(titleId: string, minutes: number) {
  testDb.update(titles).set({ runtimeMinutes: minutes }).where(eq(titles.id, titleId)).run();
}

function tagGenre(titleId: string, genreId: number, name: string) {
  testDb.insert(genres).values({ id: genreId, name }).onConflictDoNothing().run();
  testDb.insert(titleGenres).values({ titleId, genreId }).run();
}

describe("getWatchInsights", () => {
  test("is empty for a user with no watches", () => {
    insertUser();
    expect(getWatchInsights("user-1")).toEqual({
      watchMinutes: 0,
      topGenre: null,
      busiestWeekday: null,
    });
  });

  test("sums movie runtimes and episode runtimes, with the show runtime as fallback", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    setRuntime("m1", 100);
    const { episodeIds } = insertTvShow("tv-1", 99);
    setRuntime("tv-1", 40);
    // First episode has its own runtime, the others fall back to the show's 40.
    testDb.update(episodes).set({ runtimeMinutes: 50 }).where(eq(episodes.id, episodeIds[0])).run();

    insertMovieWatch("user-1", "m1");
    insertMovieWatch("user-1", "m1"); // rewatch counts again
    insertEpisodeWatch("user-1", episodeIds[0]);
    insertEpisodeWatch("user-1", episodeIds[1]);

    expect(getWatchInsights("user-1").watchMinutes).toBe(100 + 100 + 50 + 40);
  });

  test("ignores other users' watches", () => {
    insertUser();
    insertUser("user-2");
    insertTitle({ id: "m1", tmdbId: 1 });
    setRuntime("m1", 90);
    insertMovieWatch("user-2", "m1");
    expect(getWatchInsights("user-1").watchMinutes).toBe(0);
  });

  test("top genre counts distinct titles, not episodes", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    insertTitle({ id: "m2", tmdbId: 2 });
    tagGenre("m1", 1, "Drama");
    tagGenre("m2", 1, "Drama");
    const { episodeIds } = insertTvShow("tv-1", 99);
    tagGenre("tv-1", 2, "Comedy");

    insertMovieWatch("user-1", "m1");
    insertMovieWatch("user-1", "m2");
    // Three episode watches of one show must not outweigh two movies.
    for (const id of episodeIds) insertEpisodeWatch("user-1", id);

    expect(getWatchInsights("user-1").topGenre).toBe("Drama");
  });

  test("busiest weekday is the most frequent day of the week (0 = Sunday)", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    // 2026-03-01 is a Sunday, 2026-03-02 a Monday.
    insertMovieWatch("user-1", "m1", new Date("2026-03-01T12:00:00Z"));
    insertMovieWatch("user-1", "m1", new Date("2026-03-02T12:00:00Z"));
    insertMovieWatch("user-1", "m1", new Date("2026-03-09T12:00:00Z"));
    expect(getWatchInsights("user-1").busiestWeekday).toBe(1);
  });
});
