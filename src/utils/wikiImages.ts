import { setBounded } from "./boundedCache";

// Module-level cache — survives re-renders without a context provider. Bounded
// so a long browsing session (many destinations) can't grow it without limit.
const cache = new Map<string, string | null>();
const MAX_CACHE_SIZE = 200;

// Shape of the Wikimedia `imageinfo` API response we consume (a typed subset).
type WikiImageInfo = {
  mime?: string;
  width?: number;
  thumbwidth?: number;
  thumburl?: string;
  url?: string;
};
type WikiPage = { imageinfo?: WikiImageInfo[] };
type WikiQueryResponse = { query?: { pages?: Record<string, WikiPage> } };

// Retry fetch on 429 with exponential backoff (max 2 retries)
async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url);
    if (res.status !== 429 || i === retries) return res;
    const wait = (i + 1) * 1500; // 1.5s, 3s
    await new Promise((r) => setTimeout(r, wait));
  }
  return fetch(url); // unreachable but satisfies TS
}

// Searches Wikimedia Commons for a photographic image matching `query`.
// Returns a thumbnail URL at ~1200px width, or null if nothing suitable found.
export async function getWikiImage(query: string): Promise<string | null> {
  if (cache.has(query)) return cache.get(query) ?? null;

  if (query.startsWith("http") || query.startsWith("/")) {
    setBounded(cache, query, query, MAX_CACHE_SIZE);
    return query;
  }

  try {
    const params = new URLSearchParams({
      action:       "query",
      generator:    "search",
      gsrnamespace: "6",          // File namespace only
      gsrsearch:    query,
      gsrlimit:     "12",         // Fetch more so we can filter SVGs / tiny images
      prop:         "imageinfo",
      iiprop:       "url|mime|size",
      iiurlwidth:   "1024",       // 1024px is a standard pre-rendered Wikimedia thumbnail size
      format:       "json",
      origin:       "*",          // CORS
    });

    const res = await fetchWithRetry(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!res.ok) {
      // Never cache a failure — a transient 4xx/5xx (or throttle) must not
      // poison the whole page session so the query is stuck returning null on
      // every later render. Returning without caching lets the next attempt retry.
      return null;
    }

    const data = (await res.json()) as WikiQueryResponse;
    const pages = Object.values(data?.query?.pages ?? {});

    // Pick first JPEG/PNG that is at least 600px wide
    const photo = pages.find((p) => {
      const info = p.imageinfo?.[0];
      if (!info) return false;
      const mime = info.mime ?? "";
      const width = info.width ?? 0;
      return (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") && width >= 600;
    });

    const info = photo?.imageinfo?.[0];
    // thumbwidth is returned automatically with iiurlwidth.
    // If it's < 900px the original image is smaller than our requested size —
    // the thumbnail URL at 1024px won't exist on the CDN, so use the original url instead.
    const thumbWidth = info?.thumbwidth ?? 0;
    const raw: string | null = thumbWidth >= 900
      ? (info?.thumburl ?? info?.url ?? null)
      : (info?.url ?? null);
    // Strip query params — upload.wikimedia.org CDN rejects them on image paths.
    const src = raw ? raw.split("?")[0] : null;
    // Only cache a positive hit. A miss is left uncached so a later attempt can
    // retry rather than being permanently latched to null for the session.
    if (src) setBounded(cache, query, src, MAX_CACHE_SIZE);
    return src;
  } catch {
    return null;
  }
}
