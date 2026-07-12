import type { BudgetBasis } from "./budget";
import type { TripScope } from "../trip/destinationSource";
import { extractPlanCities, type TripPlan } from "./tripPlans";

/** One country leg of a saved trip, snapshotted at save time. */
export type SavedTripStop = {
  country: string;
  /** Honest planned length (the stop's rendered itinerary day count). */
  days: number;
  cities: string[];
  /** The stop's effective experience focus at save time (empty = no focus). */
  experiences?: string[];
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
  /**
   * The trip scope this snapshot was planned in. Determines which destination
   * source resolves its stops on reopen (world countries vs India states), and
   * drives the International/India identifier on the My Trips card. Optional for
   * back-compat: trips saved before scopes existed are treated as international.
   */
  scope?: TripScope;
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
  stops: { country: string; days: number; cities: string[]; experiences: string[] }[];
  basis: BudgetBasis;
  /** Scope the trip was saved in, so reopen restores the right destination
   *  source. Optional for back-compat; readers default to international. */
  scope?: TripScope;
  nonce: number;
};

/** The scope a saved trip was planned in, defaulting legacy trips to international. */
export function tripScopeOf(trip: Pick<SavedTrip, "scope">): TripScope {
  return trip.scope ?? "international";
}

/** Build an {@link OpenTripRequest} from a saved trip (My Trips reopen / resume). */
export function toOpenRequest(trip: SavedTrip, nonce: number): OpenTripRequest {
  return {
    stops: trip.stops.map((s) => ({ country: s.country, days: s.days, cities: s.cities, experiences: s.experiences ?? [] })),
    basis: trip.basis,
    scope: tripScopeOf(trip),
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

/** Runtime guard for a single persisted stop (storage may be corrupt/tampered). */
function isSavedTripStop(v: unknown): v is SavedTripStop {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.country === "string" &&
    typeof o.days === "number" &&
    Number.isFinite(o.days) &&
    Array.isArray(o.cities) &&
    o.cities.every((c) => typeof c === "string") &&
    (o.experiences === undefined || (Array.isArray(o.experiences) && o.experiences.every((e) => typeof e === "string")))
  );
}

const VALID_BASES = new Set(["solo", "couple", "family4"]);

/** Runtime guard for a persisted {@link SavedTrip}. */
export function isSavedTrip(v: unknown): v is SavedTrip {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    Array.isArray(o.stops) &&
    o.stops.length > 0 &&
    o.stops.every(isSavedTripStop) &&
    typeof o.basis === "string" &&
    VALID_BASES.has(o.basis) &&
    typeof o.totalDays === "number" &&
    Number.isFinite(o.totalDays) &&
    typeof o.costPerPerson === "string" &&
    typeof o.savedAt === "string" &&
    (o.favorite === undefined || typeof o.favorite === "boolean") &&
    (o.scope === undefined || o.scope === "international" || o.scope === "domestic")
  );
}

/**
 * Sanitize a raw persisted value into a clean `SavedTrip[]`. Drops individual
 * malformed entries rather than discarding the whole list, so one corrupt record
 * can't wipe every saved trip. Returns `[]` when the blob isn't even an array.
 */
export function sanitizeSavedTrips(raw: unknown): SavedTrip[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isSavedTrip);
}

/** Per-stop input for a snapshot — the stop's tuned length + its own plan (if
 * the destination has itinerary data; a stop without a loaded plan still counts
 * toward the route identity so the saved trip name stays honest). The stored day
 * count is the plan's honest rendered length (which may exceed the requested
 * `days` when the cities need more room), so a reopened trip's numbers add up. */
export type SnapshotStop = { country: string; days: number; plan?: TripPlan; experiences?: string[] };

export type SnapshotInput = {
  /** Stops in visit order (primary first). */
  stops: SnapshotStop[];
  /** The whole route folded into one plan (single-stop = the primary plan). */
  composed: TripPlan;
  basis: BudgetBasis;
  /** Scope the trip was planned in (world countries vs India states). Optional
   *  for back-compat; omitted ⇒ international. */
  scope?: TripScope;
};

/**
 * Build the persistable fields of a saved trip from the wizard's live plan
 * state. Pure (time injected) so it is trivially unit-testable; `id`/`favorite`
 * are owned by the store's upsert, which preserves them across re-saves.
 *
 * Each stop's `days` is taken from its *rendered* plan length (not the requested
 * length), so the per-stop numbers sum to the composed total and a reopened trip
 * shows the same lengths it was saved with — no "8d pinned vs 11d shown" drift.
 */
export function buildTripSnapshot(
  input: SnapshotInput,
  now: () => string = () => new Date().toISOString(),
): Omit<SavedTrip, "id" | "favorite"> {
  const stops: SavedTripStop[] = input.stops.map((s) => ({
    country: s.country,
    days: s.plan ? s.plan.days.length : s.days,
    cities: s.plan ? extractPlanCities(s.plan.days) : [],
    experiences: s.experiences && s.experiences.length > 0 ? s.experiences : undefined,
  }));
  return {
    name: tripSignature(stops.map((s) => s.country)),
    stops,
    basis: input.basis,
    totalDays: input.composed.days.length,
    costPerPerson: input.composed.costPerPerson,
    savedAt: now(),
    scope: input.scope ?? "international",
  };
}
