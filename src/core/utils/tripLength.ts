/** A stop as the trip-length lever sees it: its current nights, upper bound, and
 *  whether the traveller pinned its length (pinned stops never auto-adjust). */
export type LengthStop = { days: number; maxDays: number; pinned: boolean };

/** Lower bound for any stop — a trip stop is at least one night. */
export const MIN_STOP_NIGHTS = 1;

/**
 * Pick which stop absorbs a ±1-night change to the trip total, keeping unpinned
 * stops balanced. Growing fills the currently-shortest eligible stop; shrinking
 * drains the currently-longest — so repeated clicks spread evenly instead of
 * piling onto one stop. Pinned stops and stops already at their bound are skipped.
 * Returns the stop index to adjust, or `null` when no stop can absorb the change.
 */
export function pickNightTarget(stops: LengthStop[], dir: 1 | -1): number | null {
  let best = -1;
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    if (s.pinned) continue;
    if (dir === 1 ? s.days >= s.maxDays : s.days <= MIN_STOP_NIGHTS) continue;
    if (best === -1) {
      best = i;
      continue;
    }
    // +1 → prefer the fewest nights (even fill); -1 → prefer the most (even drain).
    if (dir === 1 ? stops[i].days < stops[best].days : stops[i].days > stops[best].days) best = i;
  }
  return best === -1 ? null : best;
}

/** Whether a ±1-night change can be absorbed by any unpinned stop. */
export function canAdjustLength(stops: LengthStop[], dir: 1 | -1): boolean {
  return pickNightTarget(stops, dir) !== null;
}
