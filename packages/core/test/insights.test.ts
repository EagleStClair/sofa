import { eq } from "drizzle-orm";
import { beforeAll, afterAll, beforeEach, describe, expect, test, vi } from "vitest";

import { episodes, titles } from "@sofa/db/schema";
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

const NOW = new Date("2026-03-31T12:00:00Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.setSystemTime(NOW);
  clearAllTables();
});

function setRuntime(titleId: string, minutes: number) {
  testDb.update(titles).set({ runtimeMinutes: minutes }).where(eq(titles.id, titleId)).run();
}

const ZERO = { movieCount: 0, movieMinutes: 0, episodeCount: 0, episodeMinutes: 0 };

describe("getWatchInsights", () => {
  test("is zero for a user with no watches", () => {
    insertUser();
    expect(getWatchInsights("user-1")).toEqual({ last30Days: ZERO, allTime: ZERO });
  });

  test("splits movies and episodes, rewatches count again, episode runtime falls back to the show's", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    setRuntime("m1", 100);
    const { episodeIds } = insertTvShow("tv-1", 99);
    setRuntime("tv-1", 40);
    testDb.update(episodes).set({ runtimeMinutes: 50 }).where(eq(episodes.id, episodeIds[0])).run();

    insertMovieWatch("user-1", "m1");
    insertMovieWatch("user-1", "m1");
    insertEpisodeWatch("user-1", episodeIds[0]);
    insertEpisodeWatch("user-1", episodeIds[1]);

    expect(getWatchInsights("user-1").allTime).toEqual({
      movieCount: 2,
      movieMinutes: 200,
      episodeCount: 2,
      episodeMinutes: 90,
    });
  });

  test("last 30 days only includes recent watches", () => {
    insertUser();
    insertTitle({ id: "m1", tmdbId: 1 });
    setRuntime("m1", 100);
    insertMovieWatch("user-1", "m1", new Date("2026-03-20T12:00:00Z")); // inside
    insertMovieWatch("user-1", "m1", new Date("2026-01-10T12:00:00Z")); // outside

    const result = getWatchInsights("user-1");
    expect(result.last30Days).toEqual({ ...ZERO, movieCount: 1, movieMinutes: 100 });
    expect(result.allTime).toEqual({ ...ZERO, movieCount: 2, movieMinutes: 200 });
  });

  test("ignores other users' watches", () => {
    insertUser();
    insertUser("user-2");
    insertTitle({ id: "m1", tmdbId: 1 });
    setRuntime("m1", 90);
    insertMovieWatch("user-2", "m1");
    expect(getWatchInsights("user-1")).toEqual({ last30Days: ZERO, allTime: ZERO });
  });
});
