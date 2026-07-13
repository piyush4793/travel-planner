/**
 * Pure, side-effect-free city-photo loader for the cinematic fly-through.
 *
 * Extracted from the ItineraryCinematic shell so the fetch/merge/timeout logic
 * can be unit-tested without a WebGL/maplibre context. Both the image resolver
 * and the timeout clock are injected, so tests stay deterministic.
 */

type GetImage = (query: string) => Promise<string | null>;

/** Resolves after `ms` — injectable so tests don't wait real time. */
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type LoadCityPhotosOptions = {
  /** Hard cap on how long to wait before returning whatever resolved. */
  capMs?: number;
  /** Injectable timer (defaults to setTimeout). */
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Fetches photos for every city in `cityImages` in parallel. Each city keeps
 * only successful, non-empty results. Returns after all lookups settle OR the
 * `capMs` timeout elapses (whichever comes first) so a slow/throttled source
 * can never stall the animation. Cities that resolve nothing are omitted.
 */
export async function loadCityPhotos(
  cityImages: Record<string, string[]>,
  getImage: GetImage,
  { capMs = 5000, sleep = realSleep }: LoadCityPhotosOptions = {},
): Promise<Record<string, string[]>> {
  const fetched: Record<string, string[]> = {};

  const perCity = Object.entries(cityImages).map(async ([cityName, articles]) => {
    const results = await Promise.allSettled(articles.map((a) => getImage(a)));
    const valid = results
      .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((v): v is string => !!v);
    if (valid.length > 0) fetched[cityName] = valid;
  });

  await Promise.race([Promise.allSettled(perCity), sleep(capMs)]);
  return fetched;
}
