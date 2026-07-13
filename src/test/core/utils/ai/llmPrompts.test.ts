import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  condenseMessages,
  defaultBrief,
  buildFinalizationPrompt,
  buildBriefSummary,
  buildRoutePlanPrompt,
  type AiPlanRequest,
} from "@/core/utils/ai/llmPrompts.ts";
import type { ChatMessage, TripBrief } from "@/core/types.ts";

describe("llmPrompts — P0", () => {
  describe("buildSystemPrompt", () => {
    it("includes home country in the prompt", () => {
      const prompt = buildSystemPrompt("India");
      expect(prompt).toContain("India");
    });

    it("includes JSON schema instructions", () => {
      const prompt = buildSystemPrompt("India");
      expect(prompt).toContain("destinationName");
      expect(prompt).toContain("costPerPerson");
      expect(prompt).toContain("costBreakdown");
      expect(prompt).toContain("bookingSuggestions");
    });

    it("includes default values", () => {
      const prompt = buildSystemPrompt("Japan");
      expect(prompt).toContain("Origin: Japan");
      expect(prompt).toContain("Travelers: 2");
      expect(prompt).toContain("Duration: 7 days");
    });
  });

  describe("defaultBrief", () => {
    it("creates brief with home country as origin", () => {
      const brief = defaultBrief("India");
      expect(brief.originCountry).toBe("India");
      expect(brief.travelers).toBe(2);
      expect(brief.durationDays).toBe(7);
      expect(brief.budget).toBe("mid-range");
      expect(brief.destinations).toEqual([]);
      expect(brief.mandatoryCities).toEqual([]);
    });
  });

  describe("buildBriefSummary", () => {
    it("includes all specified fields", () => {
      const brief: TripBrief = {
        originCountry: "India",
        destinations: ["Norway", "Sweden"],
        travelers: 3,
        durationDays: 14,
        budget: "luxury",
        mandatoryCities: ["Oslo", "Bergen"],
        preferences: ["hiking"],
        exclusions: ["crowded places"],
      };
      const summary = buildBriefSummary(brief);
      expect(summary).toContain("India");
      expect(summary).toContain("Norway");
      expect(summary).toContain("3 travelers");
      expect(summary).toContain("14 days");
      expect(summary).toContain("luxury");
      expect(summary).toContain("Oslo");
      expect(summary).toContain("hiking");
      expect(summary).toContain("crowded places");
    });

    it("handles empty optional arrays", () => {
      const brief = defaultBrief("India");
      const summary = buildBriefSummary(brief);
      expect(summary).not.toContain("Must visit");
      expect(summary).not.toContain("Preferences");
      expect(summary).not.toContain("Avoid");
    });
  });

  describe("buildFinalizationPrompt", () => {
    it("instructs JSON-only output", () => {
      const prompt = buildFinalizationPrompt();
      expect(prompt).toContain("JSON");
      expect(prompt).toContain("no markdown");
    });
  });

  describe("condenseMessages", () => {
    it("returns all messages when under threshold", () => {
      const msgs: ChatMessage[] = [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi!" },
      ];
      const brief = defaultBrief("India");
      const condensed = condenseMessages(msgs, brief);
      expect(condensed).toHaveLength(3);
    });

    it("condenses when messages exceed threshold", () => {
      const msgs: ChatMessage[] = [
        { role: "system", content: "System prompt" },
      ];
      for (let i = 0; i < 10; i++) {
        msgs.push({ role: "user", content: `User message ${i}` });
        msgs.push({ role: "assistant", content: `Response ${i}` });
      }
      const brief = defaultBrief("India");
      const condensed = condenseMessages(msgs, brief);
      // Should be: system + brief summary + last 6 non-system = 8
      expect(condensed.length).toBeLessThan(msgs.length);
      expect(condensed.length).toBe(8);
    });

    it("preserves system messages in condensed output", () => {
      const msgs: ChatMessage[] = [
        { role: "system", content: "System prompt" },
      ];
      for (let i = 0; i < 10; i++) {
        msgs.push({ role: "user", content: `msg ${i}` });
        msgs.push({ role: "assistant", content: `resp ${i}` });
      }
      const condensed = condenseMessages(msgs, defaultBrief("India"));
      expect(condensed[0].role).toBe("system");
      expect(condensed[1].role).toBe("system"); // brief summary
    });
  });
});

describe("buildRoutePlanPrompt — P5", () => {
  const single: AiPlanRequest = {
    signature: "Japan",
    stops: [{ name: "Japan", days: 7, cities: ["Tokyo", "Kyoto"], experiences: ["Food", "Temples"], budget: "₹80K – ₹1.2L", bestMonths: ["March", "April"] }],
    totalDays: 7,
    cost: "₹80K – ₹1.2L",
    homeCountry: "India",
    travelersLabel: "Couple",
    unitNoun: "country",
    unitNounPlural: "countries",
  };

  it("reads as a single-destination brief and always contains 'Plan a trip to <name>'", () => {
    const p = buildRoutePlanPrompt(single);
    expect(p).toContain("Plan a trip to Japan.");
    expect(p).not.toMatch(/multi-/);
    expect(p).toContain("Cities to visit: Tokyo, Kyoto.");
    expect(p).toContain("Experiences: Food, Temples.");
    expect(p).toContain("Budget: ₹80K – ₹1.2L.");
    expect(p).toContain("Best months: March, April.");
    expect(p).toMatch(/Total: ~7 days.*travelers: Couple.*starting from India/);
  });

  it("omits optional stop detail lines when absent", () => {
    const p = buildRoutePlanPrompt({
      signature: "Japan",
      stops: [{ name: "Japan", days: 1, cities: [], experiences: [] }],
      totalDays: 1,
      homeCountry: "India",
    });
    expect(p).toContain("Plan a trip to Japan.");
    expect(p).not.toMatch(/Cities to visit/);
    expect(p).not.toMatch(/Experiences/);
    expect(p).toContain("Total: ~1 day, starting from India."); // singular day
  });

  it("lists every stop in visit order with a border-crossing note for a multi-country route", () => {
    const p = buildRoutePlanPrompt({
      signature: "Japan → Thailand",
      stops: [
        { name: "Japan", days: 7, cities: ["Tokyo"], experiences: ["Food"] },
        { name: "Thailand", days: 5, cities: ["Bangkok"], experiences: ["Beaches"] },
      ],
      totalDays: 12,
      cost: "₹2L",
      homeCountry: "India",
      travelersLabel: "Couple",
      unitNoun: "country",
      unitNounPlural: "countries",
    });
    expect(p).toContain("Plan a multi-country trip: India → Japan → Thailand.");
    expect(p).toContain("Visit these 2 countries in this order:");
    const jIdx = p.indexOf("- Japan —");
    const tIdx = p.indexOf("- Thailand —");
    expect(jIdx).toBeGreaterThan(-1);
    expect(tIdx).toBeGreaterThan(jIdx); // order preserved
    expect(p).toContain("cities: Bangkok");
    expect(p).toMatch(/border-crossing transport.*between each country/);
    expect(p).toContain("Total: ~12 days, estimated cost ₹2L");
  });

  it("is scope-agnostic — uses the supplied unit nouns (domestic wording)", () => {
    const p = buildRoutePlanPrompt({
      signature: "Kerala → Goa",
      stops: [
        { name: "Kerala", days: 4, cities: ["Kochi"], experiences: [] },
        { name: "Goa", days: 3, cities: ["Panaji"], experiences: [] },
      ],
      totalDays: 7,
      homeCountry: "India",
      unitNoun: "state",
      unitNounPlural: "states",
    });
    expect(p).toContain("Plan a multi-state trip: India → Kerala → Goa.");
    expect(p).toContain("Visit these 2 states in this order:");
    expect(p).toMatch(/between each state/);
  });
});
