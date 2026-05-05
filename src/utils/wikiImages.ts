// Module-level cache — survives re-renders without a context provider
const cache = new Map<string, string | null>();

// Searches Wikimedia Commons for a photographic image matching `query`.
// Returns a thumbnail URL at ~1200px width, or null if nothing suitable found.
export async function getWikiImage(query: string): Promise<string | null> {
  if (cache.has(query)) return cache.get(query) ?? null;

  if (query.startsWith("http") || query.startsWith("/")) {
    cache.set(query, query);
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

    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!res.ok) { cache.set(query, null); return null; }

    const data = await res.json();
    const pages = Object.values(data?.query?.pages ?? {}) as any[];

    // Pick first JPEG/PNG that is at least 600px wide
    const photo = pages.find((p) => {
      const info = p.imageinfo?.[0];
      if (!info) return false;
      const mime: string  = info.mime ?? "";
      const width: number = info.width ?? 0;
      return (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") && width >= 600;
    });

    const info = photo?.imageinfo?.[0];
    // thumbwidth is returned automatically with iiurlwidth.
    // If it's < 900px the original image is smaller than our requested size —
    // the thumbnail URL at 1024px won't exist on the CDN, so use the original url instead.
    const thumbWidth: number = info?.thumbwidth ?? 0;
    const raw: string | null = thumbWidth >= 900
      ? (info?.thumburl ?? info?.url ?? null)
      : (info?.url ?? null);
    // Strip query params — upload.wikimedia.org CDN rejects them on image paths.
    const src = raw ? raw.split("?")[0] : null;
    cache.set(query, src);
    return src;
  } catch {
    return null;
  }
}
