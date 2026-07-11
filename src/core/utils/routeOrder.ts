/** A geographic point — the minimal shape route ordering needs. */
export type GeoPoint = { lat: number; lng: number };

/**
 * Move the item at `from` to index `to`, returning a new array. A no-op or an
 * out-of-range move returns the original reference unchanged, so callers (and
 * React) can cheaply skip renders on identity. Pure — never mutates the input.
 */
export function moveIndex<T>(list: T[], from: number, to: number): T[] {
  const n = list.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const R = 6371; // Earth radius (km)

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Order stops into a sensible visit sequence via a nearest-neighbour chain from
 * `startIndex` (the anchor). Returns a permutation of the input indices — a pure
 * display/ordering layer, never mutating the plan. Ties break by original index
 * so the result is deterministic; a `startIndex` out of range falls back to 0.
 *
 * Nearest-neighbour is a cheap, honest heuristic (not a TSP solver) — good enough
 * to stop a route visiting countries in a geographically silly pick order, which
 * is the correctness gap it closes. Scoped-agnostic: any list of lat/lng points.
 */
export function orderByProximity(points: GeoPoint[], startIndex = 0): number[] {
  const n = points.length;
  if (n <= 1) return points.map((_, i) => i);
  const start = startIndex >= 0 && startIndex < n ? startIndex : 0;

  const visited = new Array<boolean>(n).fill(false);
  const order: number[] = [start];
  visited[start] = true;

  let current = start;
  for (let step = 1; step < n; step++) {
    let best = -1;
    let bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const d = haversineKm(points[current], points[j]);
      if (d < bestDist) {
        bestDist = d;
        best = j;
      }
    }
    visited[best] = true;
    order.push(best);
    current = best;
  }
  return order;
}
