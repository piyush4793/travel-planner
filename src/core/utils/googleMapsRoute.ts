/**
 * Build a Google Maps Directions URL from an ordered list of stops.
 * Uses the official Maps URLs API: origin + destination + waypoints.
 * Each stop is qualified with the city name for accurate geocoding.
 * No API key needed — opens in browser/app for free.
 * Google Maps labels waypoints A, B, C… — we mirror those letters in the UI.
 */

/** Strip cost parentheticals, detail suffixes, and leading time-of-day prefixes */
function cleanStopName(raw: string): string {
  let s = raw
    .replace(/\s*\([₹$€£][\d,.]+[^)]*\)\s*$/, "")  // trailing cost like (₹500)
    .replace(/\s*—\s*.+$/, "")                        // detail after em-dash
    .replace(/^(Morning|Afternoon|Evening|Night|Early morning|Late morning|Midday|Lunchtime|Sunset|Sunrise)\s*[:–—-]\s*/i, "")
    .trim();

  // Drop generic verbs that hurt geocoding
  s = s.replace(/^(Visit|Explore|Head to|Drive to|Walk to|Check[ -]?in at|Check[ -]?out from|Depart to|Arrive at|Transfer to)\s+/i, "").trim();

  return s;
}

/** True if a stop name is too generic to be useful in a maps query */
function isGenericStop(name: string): boolean {
  const lower = name.toLowerCase();
  const generics = [
    "breakfast", "lunch", "dinner", "rest", "free time", "check-in",
    "check-out", "checkout", "departure", "arrival", "travel day",
    "transfer", "leisure", "packing", "shopping",
  ];
  return generics.some((g) => lower === g || lower.startsWith(g + " ") || lower.endsWith(" " + g));
}

function isRoutableStop(raw: string): boolean {
  const s = cleanStopName(raw);
  return s.length > 2 && !isGenericStop(s);
}

const ROUTE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type RouteInfo = {
  url: string;
  /** Maps activity index → letter label (e.g. 0→"A", 2→"B" if index 1 was skipped) */
  labels: Map<number, string>;
};

/**
 * Build route URL + per-activity letter labels.
 * Returns null if no routable stops exist.
 */
export function buildRoute(activities: string[], city: string): RouteInfo | null {
  const labels = new Map<number, string>();
  const stops: string[] = [];
  let letterIdx = 0;

  for (let i = 0; i < activities.length; i++) {
    if (!isRoutableStop(activities[i])) continue;
    const stop = cleanStopName(activities[i]);
    if (letterIdx < ROUTE_LETTERS.length) {
      labels.set(i, ROUTE_LETTERS[letterIdx]);
    }
    stops.push(`${stop}, ${city}`);
    letterIdx++;
  }

  if (stops.length === 0) return null;

  const origin = encodeURIComponent(stops[0]);
  const destination = encodeURIComponent(stops[stops.length - 1]);
  const waypoints = stops.length > 2
    ? `&waypoints=${stops.slice(1, -1).map(encodeURIComponent).join("|")}`
    : "";

  return {
    url: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`,
    labels,
  };
}
