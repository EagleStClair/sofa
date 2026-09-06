import {
  getFilteredLibrary,
  getLibraryGenres,
  getRecentlyWatched,
  type LibraryFilters,
} from "@sofa/db/queries/library";

import { getDisplayStatusesByTitleIds, getEpisodeProgressByTitleIds } from "./tracking";

export type { LibraryFilters };

export function getFilteredLibraryFeed(userId: string, filters: LibraryFilters) {
  const result = getFilteredLibrary(userId, filters);

  const titleIds = result.items.map((i) => i.titleId);
  const displayStatuses = getDisplayStatusesByTitleIds(userId, titleIds);

  return {
    items: result.items.map((item) => ({
      titleId: item.titleId,
      title: item.title,
      type: item.type,
      tmdbId: item.tmdbId,
      posterPath: item.posterPath,
      posterThumbHash: item.posterThumbHash,
      releaseDate: item.releaseDate,
      firstAirDate: item.firstAirDate,
      voteAverage: item.voteAverage,
      userStatus: displayStatuses[item.titleId] ?? null,
      userRating: item.userRating ?? null,
    })),
    page: result.page,
    totalPages: result.totalPages,
    totalResults: result.totalResults,
  };
}

export function getLibraryGenresList(userId: string) {
  return getLibraryGenres(userId);
}

export function getRecentlyWatchedFeed(userId: string, limit: number) {
  const items = getRecentlyWatched(userId, limit);
  const titleIds = items.map((i) => i.titleId);
  const displayStatuses = getDisplayStatusesByTitleIds(userId, titleIds);

  const tvTitleIds = items.filter((i) => i.type === "tv").map((i) => i.titleId);
  const episodeProgress = getEpisodeProgressByTitleIds(userId, tvTitleIds);

  return items.map((item) => ({
    ...item,
    userStatus: displayStatuses[item.titleId] ?? null,
    episodeProgress: item.type === "tv" ? (episodeProgress[item.titleId] ?? null) : null,
  }));
}