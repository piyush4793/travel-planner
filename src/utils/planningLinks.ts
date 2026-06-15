/**
 * Generate top 3 external planning resource links for a country.
 * All links are deterministic — no API calls needed.
 */

export type PlanningLink = {
  emoji: string;
  label: string;
  url: string;
  description: string;
};

/** Name overrides for URL slugs that differ from country name */
const SLUG_OVERRIDE: Record<string, string> = {
  "USA": "united-states",
  "UK": "united-kingdom",
  "UAE": "united-arab-emirates",
  "South Korea": "south-korea",
  "North Korea": "north-korea",
  "Czech Republic": "czech-republic",
  "New Zealand": "new-zealand",
  "Sri Lanka": "sri-lanka",
  "Costa Rica": "costa-rica",
  "Saudi Arabia": "saudi-arabia",
  "South Africa": "south-africa",
  "Hong Kong": "hong-kong",
};

function toSlug(name: string): string {
  return SLUG_OVERRIDE[name] ?? name.toLowerCase().replace(/\s+/g, "-");
}

function toWikiSlug(name: string): string {
  return name.replace(/\s+/g, "_");
}

export function getPlanningLinks(countryName: string): PlanningLink[] {
  const slug = toSlug(countryName);
  const wikiSlug = toWikiSlug(countryName);

  return [
    {
      emoji: "📖",
      label: "Wikivoyage Travel Guide",
      url: `https://en.wikivoyage.org/wiki/${wikiSlug}`,
      description: "Free travel guide with practical tips, maps & local advice",
    },
    {
      emoji: "🌍",
      label: "Lonely Planet",
      url: `https://www.lonelyplanet.com/${slug}`,
      description: "Expert travel recommendations, best things to do & when to visit",
    },
    {
      emoji: "🛂",
      label: "Visa & Entry Requirements",
      url: `https://www.passportindex.org/passport/${slug}/`,
      description: "Check visa requirements, passport power & entry rules",
    },
  ];
}
