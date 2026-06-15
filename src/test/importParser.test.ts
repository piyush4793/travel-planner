import { describe, expect, it } from "vitest";
import { fetchChatLink, importResultToLLM, parseImportedText } from "../utils/importParser";
import type { LLMTripPlanResult } from "../core/utils/ai/llmTransform";

describe("importParser — P1", () => {
  it("returns a clear error for empty text", () => {
    expect(parseImportedText("")).toEqual({ error: "Please paste some text to import." });
  });

  it("returns error for unrecognizable text", () => {
    const r = parseImportedText("Hello, how are you? The weather is nice today.");
    expect("error" in r).toBe(true);
  });

  it("parses structured day-by-day text and derives destination and cities", () => {
    const text = [
      "Trip to Japan",
      "Day 1 — Tokyo: Visit Shibuya, Explore Akihabara",
      "Day 2 — Kyoto: Fushimi Inari, Bamboo forest",
      "Day 3 — Osaka: Street food, Dotonbori",
    ].join("\n");

    const r = parseImportedText(text);

    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.destinationName).toContain("Japan");
    expect(r.durationDays).toBe(3);
    expect(r.cities).toEqual(["Tokyo", "Kyoto", "Osaka"]);
    expect(r.plan.days).toHaveLength(3);
    expect(r.plan.days[0]).toEqual({
      label: "Day 1 — Tokyo",
      activities: ["Visit Shibuya", "Explore Akihabara"],
    });
  });

  it("parses valid LLM JSON and converts imported results back to the LLM format", () => {
    const jsonText = JSON.stringify({
      destinationName: "Japan",
      originCountry: "India",
      travelers: 2,
      durationDays: 5,
      budgetLevel: "mid-range",
      assumptions: [],
      cities: [
        { name: "Tokyo", lat: 35.6, lng: 139.7, nights: 3 },
        { name: "Kyoto", lat: 35.0, lng: 135.7, nights: 1 },
        { name: "Osaka", lat: 34.7, lng: 135.5, nights: 1 },
      ],
      meta: { bestMonths: [], worstMonths: [], thingsToAvoid: [], comboCountries: [], highlights: [] },
      plan: {
        duration: "5 days",
        costPerPerson: "$1000-1500",
        days: [
          { label: "Day 1 — Tokyo", activities: ["Visit temple", "Evening walk"] },
          { label: "Day 2 — Tokyo", activities: ["Museum tour"] },
          { label: "Day 3 — Kyoto", activities: ["Fushimi Inari"] },
        ],
        note: "Great trip",
      },
    } satisfies LLMTripPlanResult);

    const parsed = parseImportedText(jsonText);

    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    expect(parsed.destinationName).toBe("Japan");
    expect(parsed.durationDays).toBe(5);
    expect(parsed.cities).toEqual(["Tokyo", "Kyoto", "Osaka"]);
    expect(parsed.plan.costPerPerson).toBe("$1000-1500");

    const llm = importResultToLLM(parsed, "India");
    expect(llm.destinationName).toBe("Japan");
    expect(llm.originCountry).toBe("India");
    expect(llm.durationDays).toBe(5);
    expect(llm.assumptions).toContain("Imported from external AI conversation");
    expect(llm.cities).toHaveLength(3);
    expect(llm.plan.days[0].label).toBe("Day 1 — Tokyo");
  });

  it("adds a no-budget warning when imported text has no cost information", () => {
    const text = [
      "Trip to Norway",
      "Day 1 — Oslo: Vigeland Park, Opera House",
      "Day 2 — Bergen: Bryggen, Floyen",
      "Day 3 — Flam: Railway, Fjord cruise",
    ].join("\n");

    const r = parseImportedText(text);

    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.plan.costPerPerson).toBe("Not specified");
    expect(r.warnings).toContain("No budget/cost information found");
    expect(r.promptSuggestions.some((s) => s.includes("estimated budget"))).toBe(true);
  });

  it("extracts itinerary from chat-style text with user and assistant labels", () => {
    const text = [
      "User: Plan a trip to Japan",
      "Assistant: Sure — here's a draft.",
      "Day 1 — Tokyo: Shibuya crossing, Meiji Shrine",
      "Day 2 — Kyoto: Fushimi Inari, Kinkaku-ji",
      "Day 3 — Osaka: Dotonbori, Osaka Castle",
      "User: Can you make it cheaper?",
    ].join("\n");

    const r = parseImportedText(text);

    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.durationDays).toBe(3);
    expect(r.cities).toEqual(["Tokyo", "Kyoto", "Osaka"]);
  });

  it("cleans ARRIVE IN / RETURN from city names and filters noise lines", () => {
    const text = [
      "trip to Norway itinerary",
      "Day 1 — ARRIVE IN OSLO",
      "Stay: Grand Hotel Oslo",
      "Activities:",
      "Oslo Opera House",
      "Karl Johans Gate",
      "Day 2 — BERGEN",
      "Time required: Half day",
      "Bryggen Wharf",
      "Floyen funicular",
      "Day 3 — RETURN",
      "Fly back home",
    ].join("\n");

    const r = parseImportedText(text);

    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.destinationName).toContain("Norway itinerary");
    expect(r.cities).toEqual(["OSLO", "BERGEN"]);
    const allActivities = r.plan.days.flatMap((d) => d.activities);
    expect(allActivities).not.toContain("Stay: Grand Hotel Oslo");
    expect(allActivities).not.toContain("Activities:");
    expect(allActivities).not.toContain("Time required: Half day");
    expect(allActivities).toContain("Oslo Opera House");
    expect(allActivities).toContain("Bryggen Wharf");
  });

  it("derives Norway as the destination from trip phrasing", () => {
    const text = [
      "Here is your trip to Norway plan:",
      "Day 1 — Oslo: Visit Vigeland Park",
      "Day 2 — Bergen: Bryggen Wharf",
      "Day 3 — Flam: Flam Railway",
    ].join("\n");

    const r = parseImportedText(text);

    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.destinationName).toContain("Norway");
  });

  it("rejects invalid share links before fetching", async () => {
    await expect(fetchChatLink("https://example.com/not-a-share-link")).resolves.toEqual({
      error: "Please paste a valid ChatGPT or Claude share link (https://chatgpt.com/share/... or https://claude.ai/share/...)",
    });
  });
});
