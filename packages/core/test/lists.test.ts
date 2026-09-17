import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  clearAllTables,
  insertStatus,
  insertTitle,
  insertUser,
} from "@sofa/test/db";

const { mockGetTvExternalIds } = vi.hoisted(() => ({
  mockGetTvExternalIds: vi.fn(
    (): Promise<{ tvdb_id: number | null; imdb_id: string | null }> =>
      Promise.resolve({ tvdb_id: 55555, imdb_id: "tt9999999" }),
  ),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getTvExternalIds: mockGetTvExternalIds,
}));

beforeEach(() => {
  clearAllTables();
  mockGetTvExternalIds.mockClear();
});


describe("parseStatusParam", () => {
  test("defaults to watchlist when null", () => {
    expect(parseStatusParam(null)).toEqual(["watchlist"]);
  });

  test("parses comma-separated statuses", () => {
    expect(parseStatusParam("watchlist,in_progress")).toEqual(["watchlist", "in_progress"]);
  });

  test("filters invalid statuses", () => {
    expect(parseStatusParam("watchlist,invalid,completed")).toEqual(["watchlist", "completed"]);
  });

  test("defaults to watchlist when all invalid", () => {
    expect(parseStatusParam("foo,bar")).toEqual(["watchlist"]);
  });
});

  test("excludes movies", async () => {
    insertUser("user-1");
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });
    insertTitle({
      id: "tv1",
      tmdbId: 300,
      tvdbId: 12345,
      type: "tv",
      title: "Show A",
    });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "tv1", "watchlist");

    const list = await getSonarrList("user-1");
    expect(list).toEqual([{ TvdbId: 12345, Title: "Show A" }]);
  });

  test("lazily resolves missing TVDB ID", async () => {
    insertUser("user-1");
    insertTitle({ id: "tv1", tmdbId: 300, type: "tv", title: "Show B" });
    insertStatus("user-1", "tv1", "watchlist");

    mockGetTvExternalIds.mockResolvedValueOnce({
      tvdb_id: 55555,
      imdb_id: "tt1234567",
    });

    const list = await getSonarrList("user-1");
    expect(list).toEqual([{ TvdbId: 55555, Title: "Show B" }]);
    expect(mockGetTvExternalIds).toHaveBeenCalledWith(300);
  });

  test("skips shows where TVDB ID cannot be resolved", async () => {
    insertUser("user-1");
    insertTitle({ id: "tv1", tmdbId: 300, type: "tv", title: "Show C" });
    insertStatus("user-1", "tv1", "watchlist");

    mockGetTvExternalIds.mockResolvedValueOnce({
      tvdb_id: null,
      imdb_id: null,
    });

    const list = await getSonarrList("user-1");
    expect(list).toEqual([]);
  });

  test("filters by status", async () => {
    insertUser("user-1");
    insertTitle({
      id: "tv1",
      tmdbId: 300,
      tvdbId: 111,
      type: "tv",
      title: "Show A",
    });
    insertTitle({
      id: "tv2",
      tmdbId: 400,
      tvdbId: 222,
      type: "tv",
      title: "Show B",
    });
    insertStatus("user-1", "tv1", "watchlist");
    insertStatus("user-1", "tv2", "in_progress");

    const watchlist = await getSonarrList("user-1", ["watchlist"]);
    expect(watchlist).toEqual([{ TvdbId: 111, Title: "Show A" }]);

    // 'completed' maps to 'in_progress' for TV (completion is derived)
    const all = await getSonarrList("user-1", ["watchlist", "completed"]);
    expect(all).toHaveLength(2);
  });
});
