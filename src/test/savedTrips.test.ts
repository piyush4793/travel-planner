import { describe, expect, it } from "vitest";
import { buildTripSnapshot, tripSignature, type SnapshotStop } from "../core/utils/savedTrips";
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

  it("snapshots single-country stops, cities, totals and time", () => {
    const stops: SnapshotStop[] = [{ country: "Japan", days: 5, plan: plan(["Tokyo", "Kyoto"]) }];
    const composed = plan(["Tokyo", "Kyoto"], "₹3L–₹4L");
    const snap = buildTripSnapshot({ stops, composed, basis: "couple" }, now);
    expect(snap.name).toBe("Japan");
    expect(snap.stops).toEqual([{ country: "Japan", days: 5, cities: ["Tokyo", "Kyoto"] }]);
    expect(snap.totalDays).toBe(2);
    expect(snap.costPerPerson).toBe("₹3L–₹4L");
    expect(snap.basis).toBe("couple");
    expect(snap.savedAt).toBe("2026-01-02T03:04:05.000Z");
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
