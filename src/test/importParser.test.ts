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
});
