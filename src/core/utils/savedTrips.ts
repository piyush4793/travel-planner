import type { BudgetBasis } from "./budget";
import { extractPlanCities, type TripPlan } from "./tripPlans";

/** One country leg of a saved trip, snapshotted at save time. */
export type SavedTripStop = {
  country: string;
  days: number;
  cities: string[];
};

/**
 * A trip the traveller composed in the Plan wizard and saved — a self-contained
 * snapshot (not a live reference), so it stays viewable even if My List or the
 * underlying rules later change. The store is keyed by {@link tripSignature}, so
 * re-saving the same ordered route updates its record in place.
 */
export type SavedTrip = {
  id: string;
  /** Display name — the ordered route ("Norway → Denmark") or a single country. */
  name: string;
  stops: SavedTripStop[];
  basis: BudgetBasis;
  totalDays: number;
  /** Composed cost-per-person range at save time, for the chosen basis. */
  costPerPerson: string;
  /** ISO timestamp the trip was first saved. */
  savedAt: string;
  favorite?: boolean;
};

/**
 * Stable identity of a trip = its ordered country names. Re-saving the same
 * ordered set updates the existing record rather than creating a duplicate;
 * a different order (a genuinely different route) is a distinct trip.
 */
export function tripSignature(countries: string[]): string {
  return countries.join(" → ");
}

/**
 * A saved trip reopened into the Plan wizard: ordered stops (each with its
 * snapshot cities + tuned length) plus the basis it was saved for. Applied once
 * per `nonce`, so re-opening the same trip re-applies but a stale prop never
 * clobbers in-progress edits.
 */
export type OpenTripRequest = {
  stops: { country: string; days: number; cities: string[] }[];
  basis: BudgetBasis;
  nonce: number;
};

/** Build an {@link OpenTripRequest} from a saved trip (My Trips reopen / resume). */
export function toOpenRequest(trip: SavedTrip, nonce: number): OpenTripRequest {
  return {
    stops: trip.stops.map((s) => ({ country: s.country, days: s.days, cities: s.cities })),
    basis: trip.basis,
    nonce,
  };
}

/**
 * Find a saved trip for the picked country set. Prefers an exact ordered
 * signature match; falls back to the newest trip with the same *set* of stops
 * (order-insensitive), so a reordered pick of the same countries still resumes a
 * saved plan. Assumes `trips` is newest-first (as {@link SavedTrip} stores it).
 */
export function findSavedTripForCountries(trips: SavedTrip[], countries: string[]): SavedTrip | null {
  if (countries.length === 0) return null;
  const exact = trips.find((t) => t.name === tripSignature(countries));
  if (exact) return exact;
  const setKey = [...countries].sort().join("\u0000");
  return trips.find((t) => [...t.stops.map((s) => s.country)].sort().join("\u0000") === setKey) ?? null;
}

/** Per-stop input for a snapshot — the stop's tuned length + its own plan (if
 * the destination has itinerary data; a stop without a loaded plan still counts
 * toward the route identity so the saved trip name stays honest). */
export type SnapshotStop = { country: string; days: number; plan?: TripPlan };

export type SnapshotInput = {
  /** Stops in visit order (primary first). */
  stops: SnapshotStop[];
  /** The whole route folded into one plan (single-stop = the primary plan). */
  composed: TripPlan;
  basis: BudgetBasis;
};

/**
 * Build the persistable fields of a saved trip from the wizard's live plan
 * state. Pure (time injected) so it is trivially unit-testable; `id`/`favorite`
 * are owned by the store's upsert, which preserves them across re-saves.
 */
export function buildTripSnapshot(
  input: SnapshotInput,
  now: () => string = () => new Date().toISOString(),
): Omit<SavedTrip, "id" | "favorite"> {
  const stops: SavedTripStop[] = input.stops.map((s) => ({
    country: s.country,
    days: s.days,
    cities: s.plan ? extractPlanCities(s.plan.days) : [],
  }));
  return {
    name: tripSignature(stops.map((s) => s.country)),
    stops,
    basis: input.basis,
    totalDays: input.composed.days.length,
    costPerPerson: input.composed.costPerPerson,
    savedAt: now(),
  };
}
