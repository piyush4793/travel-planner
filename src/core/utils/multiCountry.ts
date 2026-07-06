/**
 * Shared configuration and pure helpers for multi-unit trip planning.
 *
 * The Plan page lets a traveller compose a single trip from several destination
 * units — countries in the international scope today, and India cities in the
 * future domestic scope. The cap is a named constant (not a hardcoded literal at
 * call sites) so it can be tuned per scope without hunting down magic numbers.
 */
export const MAX_TRIP_UNITS = 4;

/**
 * Toggle a unit in an ordered, de-duplicated selection.
 *
 * - Selecting an already-selected unit removes it (preserving the order of the
 *   rest).
 * - Selecting a new unit appends it (pick order = intended visit order seed).
 * - Appends are ignored once `max` is reached, so callers never exceed the cap.
 *
 * Returns a new array; the input is never mutated.
 */
export function toggleTripSelection(
  selected: readonly string[],
  name: string,
  max: number = MAX_TRIP_UNITS,
): string[] {
  if (selected.includes(name)) return selected.filter((n) => n !== name);
  if (selected.length >= max) return [...selected];
  return [...selected, name];
}
