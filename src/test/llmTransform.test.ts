import { describe, it, expect } from "vitest";
import { extractTripPlanResult } from "../core/utils/ai/llmTransform";

const VALID_PLAN = {
  destinationName: "Norway",
  originCountry: "India",
  travelers: 2,
  durationDays: 7,
  budgetLevel: "mid-range",
  assumptions: ["Traveling in September"],
  cities: [
    { name: "Oslo", lat: 59.91, lng: 10.75, nights: 2, transportToNext: { type: "train", label: "Bergen Railway", cost: "₹3K" } },
    { name: "Bergen", lat: 60.39, lng: 5.32, nights: 3 },
  ],
  meta: {
    bestMonths: ["June", "July", "August"],
    worstMonths: ["November", "December"],
    thingsToAvoid: ["Mountain roads in winter"],
    visaTips: "Schengen visa required",
    comboCountries: ["Sweden", "Denmark"],
    highlights: ["Fjords", "Northern Lights"],
  },
  plan: {
    duration: "7 days / 6 nights",
    costPerPerson: "₹1.2L – ₹1.8L",
    note: "A stunning Norwegian adventure",
    days: [
      {
        label: "Day 1 — Oslo",
        activities: ["Visit Viking Museum", "Walk Karl Johan street", "Try local seafood"],
        theme: "Arrival",
        hotels: ["Budget: CityBox (~₹3K/night)", "Mid: Thon Hotel (~₹6K/night)"],
      },
      {
        label: "Day 2 — Bergen",
        activities: ["Explore Bryggen wharf", "Take Fløibanen funicular"],
        theme: "Culture & Nature",
      },
    ],
  },
};

describe("llmTransform — P0", () => {
  it("parses valid JSON response", () => {
    const raw = JSON.stringify(VALID_PLAN);
    const { result, error } = extractTripPlanResult(raw);
    expect(error).toBeUndefined();
    expect(result).not.toBeNull();
    expect(result!.destinationName).toBe("Norway");
    expect(result!.plan.days).toHaveLength(2);
  });

  it("extracts JSON from markdown code fences", () => {
    const raw = "Here is your plan:\n```json\n" + JSON.stringify(VALID_PLAN) + "\n```\nEnjoy!";
    const { result } = extractTripPlanResult(raw);
    expect(result).not.toBeNull();
    expect(result!.destinationName).toBe("Norway");
  });

  it("extracts JSON embedded in surrounding text", () => {
    const raw = "Sure! " + JSON.stringify(VALID_PLAN) + " Hope you like it!";
    const { result } = extractTripPlanResult(raw);
    expect(result).not.toBeNull();
  });

  it("returns error for empty string", () => {
    const { result, error } = extractTripPlanResult("");
    expect(result).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error for invalid JSON", () => {
    const { result, error } = extractTripPlanResult("{not valid json}");
    expect(result).toBeNull();
    expect(error).toContain("parse");
  });

  it("returns error when destinationName is missing", () => {
    const bad = { ...VALID_PLAN, destinationName: "" };
    const { result, error } = extractTripPlanResult(JSON.stringify(bad));
    expect(result).toBeNull();
    expect(error).toContain("destinationName");
  });

  it("returns error when plan has no days", () => {
    const bad = { ...VALID_PLAN, plan: { ...VALID_PLAN.plan, days: [] } };
    const { result, error } = extractTripPlanResult(JSON.stringify(bad));
    expect(result).toBeNull();
    expect(error).toContain("Invalid");
  });

  it("returns error when a day has no activities", () => {
    const bad = {
      ...VALID_PLAN,
      plan: {
        ...VALID_PLAN.plan,
        days: [{ label: "Day 1 — Oslo", activities: [] }],
      },
    };
    const { result } = extractTripPlanResult(JSON.stringify(bad));
    expect(result).toBeNull();
  });

  it("defaults missing optional fields gracefully", () => {
    const minimal = {
      destinationName: "Japan",
      plan: {
        duration: "5 days",
        costPerPerson: "₹1L",
        note: "Quick trip",
        days: [{ label: "Day 1 — Tokyo", activities: ["Visit shrine"] }],
      },
    };
    const { result } = extractTripPlanResult(JSON.stringify(minimal));
    expect(result).not.toBeNull();
    expect(result!.originCountry).toBe("Unknown");
    expect(result!.travelers).toBe(2);
    expect(result!.budgetLevel).toBe("mid-range");
    expect(result!.assumptions).toEqual([]);
  });

  it("validates costBreakdown as object when present", () => {
    const withCost = {
      ...VALID_PLAN,
      plan: {
        ...VALID_PLAN.plan,
        days: [{
          label: "Day 1 — Oslo",
          activities: ["Visit"],
          costBreakdown: { flights: "₹15K", total: "₹20K" },
        }],
      },
    };
    const { result } = extractTripPlanResult(JSON.stringify(withCost));
    expect(result).not.toBeNull();
    expect(result!.plan.days[0].costBreakdown?.flights).toBe("₹15K");
  });

  it("validates bookingSuggestions as string array when present", () => {
    const withBooking = {
      ...VALID_PLAN,
      plan: {
        ...VALID_PLAN.plan,
        days: [{
          label: "Day 1 — Oslo",
          activities: ["Visit"],
          bookingSuggestions: ["Oslo Fjord Cruise — Viator ~₹4K"],
        }],
      },
    };
    const { result } = extractTripPlanResult(JSON.stringify(withBooking));
    expect(result).not.toBeNull();
    expect(result!.plan.days[0].bookingSuggestions).toHaveLength(1);
  });

  it("rejects days exceeding max count (60)", () => {
    const tooMany = {
      ...VALID_PLAN,
      plan: {
        ...VALID_PLAN.plan,
        days: Array.from({ length: 61 }, (_, i) => ({
          label: `Day ${i + 1} — City`,
          activities: ["Something"],
        })),
      },
    };
    const { result } = extractTripPlanResult(JSON.stringify(tooMany));
    expect(result).toBeNull();
  });

  it("parses cities with coordinates and transport", () => {
    const { result } = extractTripPlanResult(JSON.stringify(VALID_PLAN));
    expect(result).not.toBeNull();
    expect(result!.cities).toHaveLength(2);
    expect(result!.cities[0].name).toBe("Oslo");
    expect(result!.cities[0].lat).toBe(59.91);
    expect(result!.cities[0].transportToNext?.type).toBe("train");
    expect(result!.cities[1].transportToNext).toBeUndefined();
  });

  it("parses meta with bestMonths, worstMonths, thingsToAvoid", () => {
    const { result } = extractTripPlanResult(JSON.stringify(VALID_PLAN));
    expect(result).not.toBeNull();
    expect(result!.meta.bestMonths).toContain("June");
    expect(result!.meta.worstMonths).toContain("November");
    expect(result!.meta.thingsToAvoid).toHaveLength(1);
    expect(result!.meta.visaTips).toBe("Schengen visa required");
    expect(result!.meta.comboCountries).toContain("Sweden");
    expect(result!.meta.highlights).toContain("Fjords");
  });

  it("defaults cities and meta when missing", () => {
    const minimal = {
      destinationName: "Japan",
      plan: {
        duration: "5 days",
        costPerPerson: "₹1L",
        note: "Quick trip",
        days: [{ label: "Day 1 — Tokyo", activities: ["Visit shrine"] }],
      },
    };
    const { result } = extractTripPlanResult(JSON.stringify(minimal));
    expect(result).not.toBeNull();
    expect(result!.cities).toEqual([]);
    expect(result!.meta.bestMonths).toEqual([]);
    expect(result!.meta.worstMonths).toEqual([]);
    expect(result!.meta.thingsToAvoid).toEqual([]);
    expect(result!.meta.highlights).toEqual([]);
  });
});
