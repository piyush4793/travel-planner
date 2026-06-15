/**
 * Fetch country overview from Wikipedia REST API.
 * Returns a brief summary + key facts. No API key needed.
 * Results are cached in-memory for the session.
 */

export type CountryInfo = {
  summary: string;
  capital?: string;
  currency?: string;
  language?: string;
  thumbnail?: string;
};

const cache = new Map<string, CountryInfo | null>();

/** Wikipedia name overrides for countries whose article title differs */
const WIKI_NAME: Record<string, string> = {
  "USA": "United States",
  "UK": "United Kingdom",
  "UAE": "United Arab Emirates",
  "South Korea": "South Korea",
  "North Korea": "North Korea",
  "Czech Republic": "Czech Republic",
  "Hawaii": "Hawaii",
  "Scotland": "Scotland",
  "Dubai": "Dubai",
  "Antarctica": "Antarctica",
};

export async function fetchCountryInfo(countryName: string): Promise<CountryInfo | null> {
  const key = countryName.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const wikiName = WIKI_NAME[countryName] ?? countryName;
    const encoded = encodeURIComponent(wikiName.replace(/ /g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { headers: { "Api-User-Agent": "Roamwise/1.0" } }
    );
    if (!res.ok) { cache.set(key, null); return null; }

    const data = await res.json();
    const summary = data.extract ?? "";

    // Try to extract facts from the infobox via a second call (Wikidata)
    const facts = await fetchWikidataFacts(data.wikibase_item);

    const info: CountryInfo = {
      summary: truncateSummary(summary, 300),
      capital: facts?.capital,
      currency: facts?.currency,
      language: facts?.language,
      thumbnail: data.thumbnail?.source,
    };

    cache.set(key, info);
    return info;
  } catch {
    cache.set(key, null);
    return null;
  }
}

function truncateSummary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(".", maxLen);
  return cut > 100 ? text.slice(0, cut + 1) : text.slice(0, maxLen) + "…";
}

type WikidataFacts = { capital?: string; currency?: string; language?: string };

async function fetchWikidataFacts(wikidataId?: string): Promise<WikidataFacts | null> {
  if (!wikidataId) return null;
  try {
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const entity = data.entities?.[wikidataId];
    if (!entity) return null;

    const getLabel = (claims: Record<string, unknown[]>, prop: string): string | undefined => {
      const claim = claims[prop] as Array<{ mainsnak?: { datavalue?: { value?: { id?: string } } } }> | undefined;
      const id = claim?.[0]?.mainsnak?.datavalue?.value?.id;
      if (!id) return undefined;
      return id;
    };

    // P36 = capital, P38 = currency, P37 = official language
    const capitalId = getLabel(entity.claims ?? {}, "P36");
    const currencyId = getLabel(entity.claims ?? {}, "P38");
    const languageId = getLabel(entity.claims ?? {}, "P37");

    // Batch resolve labels
    const ids = [capitalId, currencyId, languageId].filter(Boolean) as string[];
    if (ids.length === 0) return null;

    const labelsRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=labels&languages=en&format=json&origin=*`
    );
    if (!labelsRes.ok) return null;
    const labelsData = await labelsRes.json();
    const resolve = (id?: string) => {
      if (!id) return undefined;
      return labelsData.entities?.[id]?.labels?.en?.value as string | undefined;
    };

    return {
      capital: resolve(capitalId),
      currency: resolve(currencyId),
      language: resolve(languageId),
    };
  } catch {
    return null;
  }
}
