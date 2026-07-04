import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchChatLink, importResultToLLM, parseImportedText } from "../utils/importParser";
import type { LLMTripPlanResult } from "../core/utils/ai/llmTransform";

/** Stub global.fetch to return the given body/status for one call. */
function mockFetchOnce(body: string, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

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

describe("importParser — analyzeGaps branch coverage", () => {
  it("emits no gap warnings when hotels, transport, cities and cost are all present", () => {
    const jsonText = JSON.stringify({
      destinationName: "Japan",
      originCountry: "India",
      travelers: 2,
      durationDays: 4,
      budgetLevel: "mid-range",
      assumptions: [],
      cities: [
        { name: "Tokyo", lat: 35.6, lng: 139.7, nights: 2 },
        { name: "Kyoto", lat: 35.0, lng: 135.7, nights: 2 },
      ],
      meta: { bestMonths: [], worstMonths: [], thingsToAvoid: [], comboCountries: [], highlights: [] },
      plan: {
        duration: "4 days",
        costPerPerson: "$1200",
        days: [
          { label: "Day 1 — Tokyo", activities: ["Take the train to Shibuya", "Check into hotel"], hotels: ["Park Hyatt"] },
          { label: "Day 2 — Tokyo", activities: ["Museum tour", "Evening flight lounge"] },
          { label: "Day 3 — Kyoto", activities: ["Fushimi Inari", "Bus to Arashiyama"] },
          { label: "Day 4 — Kyoto", activities: ["Temple walk", "Ferry ride"] },
        ],
        note: "Great trip",
      },
    } satisfies LLMTripPlanResult);

    const r = parseImportedText(jsonText);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.warnings).toEqual([]);
    expect(r.promptSuggestions).toEqual([
      "Tip: Ask 'Give me the itinerary as a structured JSON' for a more reliable import next time",
    ]);
  });

  it("warns about single city, short itinerary and sparse activities", () => {
    const jsonText = JSON.stringify({
      destinationName: "Iceland",
      originCountry: "India",
      travelers: 2,
      durationDays: 2,
      budgetLevel: "mid-range",
      assumptions: [],
      cities: [{ name: "Reykjavik", lat: 64.1, lng: -21.9, nights: 2 }],
      meta: { bestMonths: [], worstMonths: [], thingsToAvoid: [], comboCountries: [], highlights: [] },
      plan: {
        duration: "2 days",
        costPerPerson: "Not specified",
        days: [
          { label: "Day 1", activities: ["Walk"] },
          { label: "Day 2", activities: ["Rest"] },
        ],
        note: "",
      },
    } satisfies LLMTripPlanResult);

    const r = parseImportedText(jsonText);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.warnings).toEqual(
      expect.arrayContaining([
        "No budget/cost information found",
        "No hotel recommendations found",
        "No transport details between cities",
        "Only one city detected",
        "Very short itinerary — may be incomplete",
        "Activities seem sparse",
      ]),
    );
  });
});

describe("importParser — fetchChatLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects unparseable URLs", async () => {
    await expect(fetchChatLink("not a url")).resolves.toEqual({
      error: "Please paste a valid ChatGPT or Claude share link (https://chatgpt.com/share/... or https://claude.ai/share/...)",
    });
  });

  it("rejects http (non-https) share links", async () => {
    await expect(fetchChatLink("http://chatgpt.com/share/abc")).resolves.toEqual({
      error: "Please paste a valid ChatGPT or Claude share link (https://chatgpt.com/share/... or https://claude.ai/share/...)",
    });
  });

  it("returns a status error when the proxy fetch is not ok", async () => {
    mockFetchOnce("", false, 502);
    await expect(fetchChatLink("https://chatgpt.com/share/abc")).resolves.toEqual({
      error: "Failed to fetch link (502). Try pasting the conversation text manually instead.",
    });
  });

  it("extracts messages from ChatGPT __NEXT_DATA__ mapping", async () => {
    const nextData = {
      props: {
        pageProps: {
          mapping: {
            n1: { message: { author: { role: "user" }, content: { parts: ["Plan Japan"] } } },
            n2: { message: { author: { role: "assistant" }, content: { parts: ["Day 1 — Tokyo\nDay 2 — Kyoto"] } } },
            n3: { message: null },
          },
        },
      },
    };
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></html>`;
    mockFetchOnce(html);
    const r = await fetchChatLink("https://chatgpt.com/share/abc");
    expect("text" in r).toBe(true);
    if (!("text" in r)) return;
    expect(r.text).toContain("User: Plan Japan");
    expect(r.text).toContain("Assistant: Day 1 — Tokyo");
  });

  it("extracts messages via serverResponse.data.mapping structure", async () => {
    const nextData = {
      props: {
        pageProps: {
          serverResponse: {
            data: {
              mapping: {
                a: { message: { author: { role: "assistant" }, content: { parts: ["Hello from server mapping"] } } },
              },
            },
          },
        },
      },
    };
    const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
    mockFetchOnce(html);
    const r = await fetchChatLink("https://claude.ai/share/xyz");
    expect(r).toEqual({ text: "Assistant: Hello from server mapping" });
  });

  it("falls through to day-block strategies when __NEXT_DATA__ JSON is invalid", async () => {
    const html = [
      `<script id="__NEXT_DATA__">{not valid json</script>`,
      "### Day 1 — Tokyo",
      "- Visit Shibuya",
      "### Day 2 — Kyoto",
      "- Fushimi Inari",
      "### Day 3 — Osaka",
      "- Dotonbori",
      "",
    ].join("\n");
    mockFetchOnce(html);
    const r = await fetchChatLink("https://chatgpt.com/share/abc");
    expect("text" in r).toBe(true);
    if (!("text" in r)) return;
    expect(r.text).toContain("### Day 1 — Tokyo");
    expect(r.text).toContain("### Day 3 — Osaka");
  });

  it("extracts bold **Day N:** summary lines (strategy B)", async () => {
    const html = [
      "Intro paragraph without list bullets.",
      "**Day 1:** Arrive in Oslo and settle in",
      "**Day 2:** Explore Bergen old town",
      "**Day 3:** Cruise the fjords",
      "**Day 4:** Return home via Oslo",
    ].join("\n");
    mockFetchOnce(html);
    const r = await fetchChatLink("https://chatgpt.com/share/abc");
    expect("text" in r).toBe(true);
    if (!("text" in r)) return;
    expect(r.text).toContain("Day 1: Arrive in Oslo");
    expect(r.text).not.toContain("**");
  });

  it("extracts detailed day blocks (strategy C)", async () => {
    const html = [
      "Here is your plan.",
      "Day 1 → Oslo",
      "Morning sightseeing and museums",
      "Day 2 → Bergen",
      "Bryggen wharf and funicular",
    ].join("\n");
    mockFetchOnce(html);
    const r = await fetchChatLink("https://chatgpt.com/share/abc");
    expect("text" in r).toBe(true);
    if (!("text" in r)) return;
    expect(r.text).toContain("Day 1 → Oslo");
  });

  it("strips HTML tags as a last resort when no day patterns exist", async () => {
    const longText = "This is a general travel overview paragraph that is definitely longer than one hundred characters so it survives.";
    const html = `<div><p>${longText}</p><script>ignore()</script><style>.x{}</style></div>`;
    mockFetchOnce(html);
    const r = await fetchChatLink("https://chatgpt.com/share/abc");
    expect("text" in r).toBe(true);
    if (!("text" in r)) return;
    expect(r.text).toContain("general travel overview");
    expect(r.text).not.toContain("ignore()");
  });

  it("returns an extraction error when content is too short", async () => {
    mockFetchOnce("<div>tiny</div>");
    await expect(fetchChatLink("https://chatgpt.com/share/abc")).resolves.toEqual({
      error: "Could not extract conversation from the link. Try pasting the text manually.",
    });
  });

  it("returns a network error when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchChatLink("https://chatgpt.com/share/abc")).resolves.toEqual({
      error: "Network error fetching the link. Check your connection or paste the conversation text manually.",
    });
  });

  it("unescapes ChatGPT artifacts (entity/cite/image markers) via cleanChatGPTText", async () => {
    const html = [
      `entity["place","Oslo Opera House"] and citeturn0search1`,
      `image_group{a:1}`,
      `**Day 1:** Visit \\"Oslo\\" landmarks today`,
      `**Day 2:** Bergen wharf walk in old town`,
      `**Day 3:** Fjord cruise all day long`,
      `**Day 4:** Return to Oslo airport`,
    ].join("\\n");
    mockFetchOnce(html);
    const r = await fetchChatLink("https://chatgpt.com/share/abc");
    expect("text" in r).toBe(true);
    if (!("text" in r)) return;
    expect(r.text).not.toContain("citeturn");
    expect(r.text).not.toContain("image_group");
  });
});
