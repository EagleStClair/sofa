import { gunzipSync } from "node:zlib";
import { createLogger } from "@sofa/logger";
import { getImdbIdsInDb, updateImdbRating } from "@sofa/db/queries/imdb-ratings";

const log = createLogger("imdb-ratings");
const DATASET_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";

export async function refreshImdbRatings() {
  const wanted = new Set(getImdbIdsInDb());
  if (wanted.size === 0) return;
  const res = await fetch(DATASET_URL);
  const tsv = gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf-8");
  let updated = 0;
  for (const line of tsv.split("\n").slice(1)) {
    if (!line) continue;
    const [tconst, avgStr] = line.split("\t");
    if (!tconst || !wanted.has(tconst)) continue;
    updateImdbRating(tconst, Number.parseFloat(avgStr));
    updated++;
  }
  log.debug(`Updated IMDb ratings for ${updated} titles`);
}