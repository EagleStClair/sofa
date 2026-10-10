import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "../client";
import {
  episodes,
  platforms,
  seasons,
  titleAvailability,
  titles,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "../schema";

export function getMovieWatchCountSince(userId: string, since: number) {
  const [row] = db
    .select({ count: sql<number>`count(*)` })
    .from(userMovieWatches)
    .where(and(eq(userMovieWatches.userId, userId), sql`${userMovieWatches.watchedAt} >= ${since}`))
    .all();
  return row?.count ?? 0;
}

export function getEpisodeWatchCountSince(userId: string, since: number) {
  const [row] = db
    .select({ count: sql<number>`count(*)` })
    .from(userEpisodeWatches)
    .where(
      and(eq(userEpisodeWatches.userId, userId), sql`${userEpisodeWatches.watchedAt} >= ${since}`),
    )
    .all();
  return row?.count ?? 0;
}

export function getMovieWatchHistoryBuckets(userId: string, startTs: number, format: string) {
  return db
    .select({
      bucket:
        sql<string>`strftime(${format}, ${userMovieWatches.watchedAt}, 'unixepoch', 'localtime')`.as(
          "bucket",
        ),
      count: sql<number>`count(*)`.as("cnt"),
    })
    .from(userMovieWatches)
    .where(
      and(eq(userMovieWatches.userId, userId), sql`${userMovieWatches.watchedAt} >= ${startTs}`),
    )
    .groupBy(sql`strftime(${format}, ${userMovieWatches.watchedAt}, 'unixepoch', 'localtime')`)
    .all();
}

export function getEpisodeWatchHistoryBuckets(userId: string, startTs: number, format: string) {
  return db
    .select({
      bucket:
        sql<string>`strftime(${format}, ${userEpisodeWatches.watchedAt}, 'unixepoch', 'localtime')`.as(
          "bucket",
        ),
      count: sql<number>`count(*)`.as("cnt"),
    })
    .from(userEpisodeWatches)
    .where(
      and(
        eq(userEpisodeWatches.userId, userId),
        sql`${userEpisodeWatches.watchedAt} >= ${startTs}`,
      ),
    )
    .groupBy(sql`strftime(${format}, ${userEpisodeWatches.watchedAt}, 'unixepoch', 'localtime')`)
    .all();
}

/** Minutes of everything the user has watched (rewatches count again). */
export function getTotalWatchMinutes(userId: string): number {
  const movies = db
    .select({ minutes: sql<number>`coalesce(sum(${titles.runtimeMinutes}), 0)` })
    .from(userMovieWatches)
    .innerJoin(titles, eq(userMovieWatches.titleId, titles.id))
    .where(eq(userMovieWatches.userId, userId))
    .get();
  // Episodes without their own runtime fall back to the show's typical runtime.
  const eps = db
    .select({
      minutes: sql<number>`coalesce(sum(coalesce(${episodes.runtimeMinutes}, ${titles.runtimeMinutes}, 0)), 0)`,
    })
    .from(userEpisodeWatches)
    .innerJoin(episodes, eq(userEpisodeWatches.episodeId, episodes.id))
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .innerJoin(titles, eq(seasons.titleId, titles.id))
    .where(eq(userEpisodeWatches.userId, userId))
    .get();
  return (movies?.minutes ?? 0) + (eps?.minutes ?? 0);
}

/** Genre shared by the most distinct titles the user has watched. */
export function getTopWatchedGenre(userId: string): string | null {
  const row = db.get<{ name: string }>(sql`
    SELECT g.name AS name
    FROM titleGenres tg
    JOIN genres g ON g.id = tg.genreId
    WHERE tg.titleId IN (
      SELECT titleId FROM userMovieWatches WHERE userId = ${userId}
      UNION
      SELECT s.titleId
      FROM userEpisodeWatches w
      JOIN episodes e ON e.id = w.episodeId
      JOIN seasons s ON s.id = e.seasonId
      WHERE w.userId = ${userId}
    )
    GROUP BY g.id
    ORDER BY count(*) DESC, g.name
    LIMIT 1
  `);
  return row?.name ?? null;
}

/** Day of week (0 = Sunday … 6 = Saturday, server local time) with the most watches. */
export function getBusiestWeekday(userId: string): number | null {
  const row = db.get<{ day: string }>(sql`
    SELECT day FROM (
      SELECT strftime('%w', watchedAt, 'unixepoch', 'localtime') AS day
      FROM userMovieWatches WHERE userId = ${userId}
      UNION ALL
      SELECT strftime('%w', watchedAt, 'unixepoch', 'localtime') AS day
      FROM userEpisodeWatches WHERE userId = ${userId}
    )
    GROUP BY day
    ORDER BY count(*) DESC, day
    LIMIT 1
  `);
  return row ? Number(row.day) : null;
}

export function getUserStatusCounts(userId: string) {
  const [row] = db
    .select({
      librarySize: sql<number>`count(*)`,
      movieCompleted: sql<number>`sum(case when ${userTitleStatus.status} = 'completed' then 1 else 0 end)`,
    })
    .from(userTitleStatus)
    .where(eq(userTitleStatus.userId, userId))
    .all();

  // Count TV shows where all aired episodes are watched (caught_up + completed display states)
  const today = new Date().toISOString().slice(0, 10);
  const [tvRow] = db
    .select({ count: sql<number>`count(*)` })
    .from(userTitleStatus)
    .innerJoin(titles, eq(titles.id, userTitleStatus.titleId))
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.status, "in_progress"),
        eq(titles.type, "tv"),
        sql`(
          SELECT count(distinct e.id) FROM episodes e
          INNER JOIN seasons s ON e.seasonId = s.id
          WHERE s.titleId = ${titles.id} AND e.airDate IS NOT NULL AND e.airDate <= ${today}
        ) > 0`,
        sql`(
          SELECT count(distinct e.id) FROM episodes e
          INNER JOIN seasons s ON e.seasonId = s.id
          WHERE s.titleId = ${titles.id} AND e.airDate IS NOT NULL AND e.airDate <= ${today}
        ) = (
          SELECT count(distinct ew.episodeId) FROM userEpisodeWatches ew
          INNER JOIN episodes e2 ON ew.episodeId = e2.id
          INNER JOIN seasons s2 ON e2.seasonId = s2.id
          WHERE s2.titleId = ${titles.id} AND ew.userId = ${userTitleStatus.userId}
            AND e2.airDate IS NOT NULL AND e2.airDate <= ${today}
        )`,
      ),
    )
    .all();

  return {
    librarySize: row?.librarySize ?? 0,
    completed: (row?.movieCompleted ?? 0) + (tvRow?.count ?? 0),
  };
}

export function getInProgressTitleIds(userId: string) {
  return db
    .select({
      titleId: userTitleStatus.titleId,
      updatedAt: userTitleStatus.updatedAt,
    })
    .from(userTitleStatus)
    .where(and(eq(userTitleStatus.userId, userId), eq(userTitleStatus.status, "in_progress")))
    .all();
}

export function getTvTitlesByIds(titleIds: string[]) {
  if (titleIds.length === 0) return [];
  return db
    .select()
    .from(titles)
    .where(and(inArray(titles.id, titleIds), eq(titles.type, "tv")))
    .all();
}

export function getSeasonsByTitleIds(titleIds: string[]) {
  if (titleIds.length === 0) return [];
  return db
    .select()
    .from(seasons)
    .where(inArray(seasons.titleId, titleIds))
    .orderBy(seasons.titleId, seasons.seasonNumber)
    .all();
}

export function getEpisodesBySeasonIds(seasonIds: string[]) {
  if (seasonIds.length === 0) return [];
  return db
    .select()
    .from(episodes)
    .where(inArray(episodes.seasonId, seasonIds))
    .orderBy(episodes.seasonId, episodes.episodeNumber)
    .all();
}

export function getEpisodeWatchesByEpisodeIds(userId: string, episodeIds: string[]) {
  if (episodeIds.length === 0) return [];
  return db
    .select()
    .from(userEpisodeWatches)
    .where(
      and(eq(userEpisodeWatches.userId, userId), inArray(userEpisodeWatches.episodeId, episodeIds)),
    )
    .all();
}

export function getNewAvailableFeed(userId: string, _days = 14) {
  return db
    .select({
      titleId: titles.id,
      title: titles.title,
      type: titles.type,
      tmdbId: titles.tmdbId,
      posterPath: titles.posterPath,
      posterThumbHash: titles.posterThumbHash,
      releaseDate: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      voteAverage: titles.voteAverage,
      popularity: titles.popularity,
      userStatus: userTitleStatus.status,
    })
    .from(titles)
    .innerJoin(
      userTitleStatus,
      and(eq(userTitleStatus.titleId, titles.id), eq(userTitleStatus.userId, userId)),
    )
    .where(
      sql`EXISTS (SELECT 1 FROM ${titleAvailability} WHERE ${titleAvailability.titleId} = ${titles.id})`,
    )
    .orderBy(desc(titles.popularity))
    .limit(20)
    .all();
}

export function getEngagedTitleIds(userId: string) {
  return db
    .select({ titleId: userTitleStatus.titleId })
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        sql`${userTitleStatus.status} IN ('completed', 'in_progress')`,
      ),
    )
    .all()
    .map((r) => r.titleId);
}

export function getHighlyRatedTitleIds(userId: string) {
  return db
    .select({ titleId: userRatings.titleId })
    .from(userRatings)
    .where(and(eq(userRatings.userId, userId), sql`${userRatings.ratingStars} >= 4`))
    .all()
    .map((r) => r.titleId);
}

export function getAllTrackedTitleIds(userId: string) {
  return db
    .select({ titleId: userTitleStatus.titleId })
    .from(userTitleStatus)
    .where(eq(userTitleStatus.userId, userId))
    .all()
    .map((r) => r.titleId);
}

export function getTitlesByIds(titleIds: string[]) {
  if (titleIds.length === 0) return [];
  return db.select().from(titles).where(inArray(titles.id, titleIds)).all();
}

export function getTitleByIdOrNull(titleId: string) {
  return db.select().from(titles).where(eq(titles.id, titleId)).get() ?? null;
}

// ─── Upcoming feed queries ──────────────────────────────────────────

export function getUpcomingEpisodes(
  userId: string,
  fromDate: string,
  toDate: string,
  statusFilter?: string[],
) {
  const conditions = [gte(episodes.airDate, fromDate), lte(episodes.airDate, toDate)];
  if (statusFilter && statusFilter.length > 0) {
    conditions.push(
      sql`${userTitleStatus.status} IN (${sql.join(
        statusFilter.map((s) => sql`${s}`),
        sql`, `,
      )})`,
    );
  }

  return db
    .select({
      episodeId: episodes.id,
      titleId: titles.id,
      titleName: titles.title,
      posterPath: titles.posterPath,
      posterThumbHash: titles.posterThumbHash,
      backdropPath: titles.backdropPath,
      backdropThumbHash: titles.backdropThumbHash,
      seasonNumber: seasons.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      episodeName: episodes.name,
      airDate: episodes.airDate,
      userStatus: userTitleStatus.status,
    })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .innerJoin(titles, and(eq(seasons.titleId, titles.id), eq(titles.type, "tv")))
    .innerJoin(
      userTitleStatus,
      and(eq(userTitleStatus.titleId, titles.id), eq(userTitleStatus.userId, userId)),
    )
    .where(and(...conditions))
    .orderBy(asc(episodes.airDate), asc(titles.title))
    .all();
}

export function getUpcomingMovies(
  userId: string,
  fromDate: string,
  toDate: string,
  statusFilter?: string[],
) {
  const conditions = [
    eq(titles.type, "movie"),
    gte(titles.releaseDate, fromDate),
    lte(titles.releaseDate, toDate),
  ];
  if (statusFilter && statusFilter.length > 0) {
    conditions.push(
      sql`${userTitleStatus.status} IN (${sql.join(
        statusFilter.map((s) => sql`${s}`),
        sql`, `,
      )})`,
    );
  }

  return db
    .select({
      titleId: titles.id,
      titleName: titles.title,
      posterPath: titles.posterPath,
      posterThumbHash: titles.posterThumbHash,
      backdropPath: titles.backdropPath,
      backdropThumbHash: titles.backdropThumbHash,
      releaseDate: titles.releaseDate,
      userStatus: userTitleStatus.status,
    })
    .from(titles)
    .innerJoin(
      userTitleStatus,
      and(eq(userTitleStatus.titleId, titles.id), eq(userTitleStatus.userId, userId)),
    )
    .where(and(...conditions))
    .orderBy(asc(titles.releaseDate), asc(titles.title))
    .all();
}

export function getAvailabilityByTitleIds(titleIds: string[]) {
  if (titleIds.length === 0) return [];
  // Order by offerType so flatrate is picked first when the caller deduplicates
  return db
    .select({
      titleId: titleAvailability.titleId,
      platformId: platforms.id,
      providerName: platforms.name,
      logoPath: platforms.logoPath,
    })
    .from(titleAvailability)
    .innerJoin(platforms, eq(titleAvailability.platformId, platforms.id))
    .where(
      and(
        inArray(titleAvailability.titleId, titleIds),
        inArray(titleAvailability.offerType, ["flatrate", "free", "ads"]),
      ),
    )
    .orderBy(
      sql`CASE ${titleAvailability.offerType} WHEN 'flatrate' THEN 0 WHEN 'free' THEN 1 ELSE 2 END`,
    )
    .all();
}
