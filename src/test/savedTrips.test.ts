import { describe, expect, it } from "vitest";
import { buildTripSnapshot, tripSignature, toOpenRequest, findSavedTripForCountries, type SnapshotStop, type SavedTrip, type SavedTripStop } from "../core/utils/savedTrips";
import type { TripPlan } from "../core/utils/tripPlans";

function plan(cities: string[], cost = "₹1L–₹2L"): TripPlan {
  return {
    duration: `${cities.length} days`,
    costPerPerson: cost,
    days: cities.map((c, i) => ({ label: `Day ${i + 1} — ${c}`, activities: [`See ${c}`] })),
    note: "",
    costBasis: "couple",
  };
}

describe("tripSignature", () => {
  it("joins ordered names into a stable identity", () => {
    expect(tripSignature(["Norway", "Denmark"])).toBe("Norway → Denmark");
    expect(tripSignature(["Japan"])).toBe("Japan");
  });

  it("is order-sensitive (a reordered route is a different trip)", () => {
    expect(tripSignature(["Norway", "Denmark"])).not.toBe(tripSignature(["Denmark", "Norway"]));
  });
});

describe("buildTripSnapshot", () => {
  const now = () => "2026-01-02T03:04:05.000Z";

  it("snapshots single-country stops with honest rendered days, cities, totals and time", () => {
    const stops: SnapshotStop[] = [{ country: "Japan", days: 5, plan: plan(["Tokyo", "Kyoto"]) }];
    const composed = plan(["Tokyo", "Kyoto"], "₹3L–₹4L");
    const snap = buildTripSnapshot({ stops, composed, basis: "couple" }, now);
    expect(snap.name).toBe("Japan");
    // days is the honest rendered length (plan.days.length = 2), not the pre-expansion pin (5).
    expect(snap.stops).toEqual([{ country: "Japan", days: 2, cities: ["Tokyo", "Kyoto"] }]);
    expect(snap.totalDays).toBe(2);
    expect(snap.costPerPerson).toBe("₹3L–₹4L");
    expect(snap.basis).toBe("couple");
    expect(snap.savedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("stores a stop's experience focus only when present", () => {
    const stops: SnapshotStop[] = [
      { country: "Norway", days: 3, plan: plan(["Oslo", "Bergen"]), experiences: ["Fjords"] },
      { country: "Denmark", days: 2, plan: plan(["Copenhagen"]), experiences: [] },
    ];
    const snap = buildTripSnapshot({ stops, composed: plan(["Oslo", "Bergen", "Copenhagen"]), basis: "couple" }, now);
    expect(snap.stops[0].experiences).toEqual(["Fjords"]);
    // An empty focus is omitted rather than persisted as [].
    expect(snap.stops[1].experiences).toBeUndefined();
  });

  it("composes a multi-country route name, per-stop cities and composed totals", () => {
    const stops: SnapshotStop[] = [
      { country: "Norway", days: 3, plan: plan(["Oslo", "Bergen"]) },
      { country: "Denmark", days: 2, plan: plan(["Copenhagen"]) },
    ];
    const composed = plan(["Oslo", "Bergen", "Copenhagen"], "₹5L–₹6L");
    const snap = buildTripSnapshot({ stops, composed, basis: "family4" }, now);
    expect(snap.name).toBe("Norway → Denmark");
    expect(snap.stops.map((s) => s.country)).toEqual(["Norway", "Denmark"]);
    // Honest rendered lengths: Norway plan = 2 days, Denmark plan = 1 day.
    expect(snap.stops[0].days).toBe(2);
    expect(snap.stops[1].days).toBe(1);
    expect(snap.stops[0].cities).toEqual(["Oslo", "Bergen"]);
    expect(snap.stops[1].cities).toEqual(["Copenhagen"]);
    expect(snap.totalDays).toBe(3);
    expect(snap.costPerPerson).toBe("₹5L–₹6L");
    expect(snap.basis).toBe("family4");
  });

  it("defaults savedAt to a real ISO timestamp when no clock is injected", () => {
    const snap = buildTripSnapshot({ stops: [{ country: "Italy", days: 4, plan: plan(["Rome"]) }], composed: plan(["Rome"]), basis: "solo" });
    expect(() => new Date(snap.savedAt).toISOString()).not.toThrow();
    expect(new Date(snap.savedAt).getTime()).toBeGreaterThan(0);
  });
});

function savedTrip(stops: SavedTripStop[], overrides: Partial<SavedTrip> = {}): SavedTrip {
  return {
    id: overrides.id ?? stops.map((s) => s.country).join("-"),
    name: overrides.name ?? tripSignature(stops.map((s) => s.country)),
    stops,
    basis: overrides.basis ?? "couple",
    totalDays: overrides.totalDays ?? stops.reduce((n, s) => n + s.days, 0),
    costPerPerson: overrides.costPerPerson ?? "₹1L–₹2L",
    savedAt: overrides.savedAt ?? "2026-01-01T00:00:00.000Z",
    favorite: overrides.favorite,
  };
}

describe("toOpenRequest", () => {
  it("carries stops (country/days/cities/experiences), basis and the given nonce", () => {
    const trip = savedTrip(
      [
        { country: "Norway", days: 3, cities: ["Oslo", "Bergen"], experiences: ["Fjords"] },
        { country: "Denmark", days: 2, cities: ["Copenhagen"] },
      ],
      { basis: "family4" },
    );
    const req = toOpenRequest(trip, 42);
    expect(req.nonce).toBe(42);
    expect(req.basis).toBe("family4");
    expect(req.stops).toEqual([
      { country: "Norway", days: 3, cities: ["Oslo", "Bergen"], experiences: ["Fjords"] },
      // A stop with no saved focus defaults to an empty override.
      { country: "Denmark", days: 2, cities: ["Copenhagen"], experiences: [] },
    ]);
  });
});

describe("findSavedTripForCountries", () => {
  const norwayDenmark = savedTrip([
    { country: "Norway", days: 3, cities: ["Oslo"] },
    { country: "Denmark", days: 2, cities: ["Copenhagen"] },
  ]);
  const japan = savedTrip([{ country: "Japan", days: 5, cities: ["Tokyo"] }]);

  it("returns null for an empty selection", () => {
    expect(findSavedTripForCountries([norwayDenmark], [])).toBeNull();
  });

  it("matches on exact ordered signature", () => {
    expect(findSavedTripForCountries([norwayDenmark, japan], ["Norway", "Denmark"])).toBe(norwayDenmark);
    expect(findSavedTripForCountries([norwayDenmark, japan], ["Japan"])).toBe(japan);
  });

  it("falls back to an order-insensitive set match when no ordered signature matches", () => {
    // Query order (Denmark → Norway) matches no saved signature, so the set
    // fallback resolves the same-countries trip regardless of order.
    expect(findSavedTripForCountries([norwayDenmark], ["Denmark", "Norway"])).toBe(norwayDenmark);
  });

  it("prefers an exact ordered match over a set match, and the newest on a set tie", () => {
    const reordered = savedTrip(
      [
        { country: "Denmark", days: 2, cities: ["Copenhagen"] },
        { country: "Norway", days: 3, cities: ["Oslo"] },
      ],
      { id: "dk-no", name: "Denmark → Norway" },
    );
    // Exact ordered signature wins even when a set-equal trip is newer (first).
    expect(findSavedTripForCountries([reordered, norwayDenmark], ["Norway", "Denmark"])).toBe(norwayDenmark);

    // No exact signature for this order → newest (first) set-equal trip wins.
    const abc = savedTrip(
      [
        { country: "A", days: 1, cities: [] },
        { country: "B", days: 1, cities: [] },
        { country: "C", days: 1, cities: [] },
      ],
      { id: "abc", name: "A → B → C" },
    );
    const cba = savedTrip(
      [
        { country: "C", days: 1, cities: [] },
        { country: "B", days: 1, cities: [] },
        { country: "A", days: 1, cities: [] },
      ],
      { id: "cba", name: "C → B → A" },
    );
    expect(findSavedTripForCountries([cba, abc], ["B", "A", "C"])).toBe(cba);
  });

  it("returns null when no saved trip covers the set", () => {
    expect(findSavedTripForCountries([norwayDenmark, japan], ["France", "Italy"])).toBeNull();
  });
});
