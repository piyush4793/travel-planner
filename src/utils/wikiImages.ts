// Module-level cache: Wikipedia fetches survive re-renders without a provider
const cache = new Map<string, string | null>();

export async function getWikiImage(query: string): Promise<string | null> {
  if (cache.has(query)) return cache.get(query) ?? null;

  // Direct URL or local path — use as-is
  if (query.startsWith("http") || query.startsWith("/")) {
    cache.set(query, query);
    return query;
  }

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    const data = (await res.json()) as { thumbnail?: { source: string } };
    const src = data.thumbnail?.source ?? null;
    cache.set(query, src);
    return src;
  } catch {
    cache.set(query, null);
    return null;
  }
}
