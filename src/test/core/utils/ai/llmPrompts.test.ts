import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  condenseMessages,
  defaultBrief,
  buildFinalizationPrompt,
  buildBriefSummary,
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
