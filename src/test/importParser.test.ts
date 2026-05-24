import { describe, it, expect } from "vitest";
import { parseImportedText } from "../utils/importParser";

describe("importParser — P1", () => {
  it("returns error for empty text", () => {
    const r = parseImportedText("");
    expect("error" in r).toBe(true);
  });

  it("returns error for unrecognizable text", () => {
    const r = parseImportedText("Hello, how are you? The weather is nice today.");
    expect("error" in r).toBe(true);
  });

  it("parses structured day-by-day itinerary", () => {
    const text = [
      "Day 1 — Oslo: Visit Vigeland Park, Oslo Opera House, Aker Brygge",
      "Day 2 — Oslo: Viking Museum, National Museum, Holmenkollen",
      "Day 3 — Bergen: Bryggen Wharf, Floyen funicular, Fish Market",
      "Day 4 — Flam: Flam Railway, Naeroyfjord cruise",
      "Day 5 — Tromso: Arctic Cathedral, Northern Lights tour",
    ].join("\n");
    const r = parseImportedText(text);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.durationDays).toBe(5);
    expect(r.cities.length).toBeGreaterThanOrEqual(3);
    expect(r.plan.days.length).toBe(5);
  });

  it("generates prompt suggestions for sparse plan", () => {
    const text = "Day 1 — Paris: Eiffel Tower\nDay 2 — Paris: Louvre";
    const r = parseImportedText(text);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.promptSuggestions.length).toBeGreaterThan(0);
  });

  it("extracts itinerary from full chat conversation", () => {
    const text = [
      "User: Plan a 5-day trip to Japan",
      "Assistant: Here is your itinerary:",
      "Day 1 — Tokyo: Shibuya crossing, Meiji Shrine",
      "Day 2 — Tokyo: Tsukiji Market, Senso-ji Temple",
      "Day 3 — Kyoto: Fushimi Inari, Kinkaku-ji",
      "Day 4 — Kyoto: Nara day trip, deer park",
      "Day 5 — Osaka: Dotonbori, Osaka Castle",
      "User: Thanks!",
    ].join("\n");
    const r = parseImportedText(text);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.durationDays).toBe(5);
    expect(r.cities.length).toBeGreaterThanOrEqual(2);
  });

  it("suggests budget prompt when cost is missing", () => {
    const text = "Day 1 — Rome: Colosseum\nDay 2 — Rome: Vatican\nDay 3 — Florence: Uffizi";
    const r = parseImportedText(text);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.plan.costPerPerson).toBe("Not specified");
    expect(r.promptSuggestions.some((s) => s.toLowerCase().includes("budget"))).toBe(true);
  });

  it("cleans ARRIVE IN / RETURN from city names", () => {
    const text = [
      "Day 1 — ARRIVE IN OSLO",
      "Karl Johans Gate, Oslo Opera House",
      "Day 2 — OSLO",
      "Viking Museum, Holmenkollen",
      "Day 3 — BERGEN",
      "Bryggen Wharf, Fish Market",
      "Day 4 — RETURN",
      "Fly back home",
    ].join("\n");
    const r = parseImportedText(text);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    // "ARRIVE IN OSLO" should become "OSLO", "RETURN" should be skipped
    expect(r.cities).not.toContain("ARRIVE IN OSLO");
    expect(r.cities).not.toContain("RETURN");
    expect(r.cities).toContain("OSLO");
    expect(r.cities).toContain("BERGEN");
  });

  it("filters noise lines like Stay:, Activities:, Time required:", () => {
    const text = [
      "Day 1 — Oslo",
      "Stay: Grand Hotel Oslo",
      "Activities:",
      "Oslo Opera House",
      "Karl Johans Gate",
      "Time required: Half day",
      "Day 2 — Bergen",
      "Stay: Bergen Bors Hotel",
      "Bryggen Wharf",
      "Floyen funicular",
    ].join("\n");
    const r = parseImportedText(text);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    const allActivities = r.plan.days.flatMap((d) => d.activities);
    expect(allActivities).not.toContain("Stay: Grand Hotel Oslo");
    expect(allActivities).not.toContain("Activities:");
    expect(allActivities).not.toContain("Time required: Half day");
    expect(allActivities).toContain("Oslo Opera House");
    expect(allActivities).toContain("Bryggen Wharf");
  });

  it("derives destination name from trip context", () => {
    const text = [
      "Here is your 5-day trip to Norway itinerary:",
      "Day 1 — Oslo: Visit Vigeland Park",
      "Day 2 — Bergen: Bryggen Wharf",
      "Day 3 — Flam: Flam Railway",
    ].join("\n");
    const r = parseImportedText(text);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.destinationName.toLowerCase()).toContain("norway");
  });
});
