import { describe, it, expect } from "vitest";
import { createProvider, PROVIDER_LABELS, validateKey } from "../utils/ai/llmProvider";
import type { LLMProviderType } from "../types";

describe("llmProvider — P1", () => {
  describe("createProvider factory", () => {
    it("creates OpenAI provider", () => {
      const provider = createProvider("openai", "sk-test");
      expect(provider.name).toBe("openai");
    });

    it("creates Claude provider", () => {
      const provider = createProvider("claude", "sk-ant-test");
      expect(provider.name).toBe("claude");
    });

    it("creates Gemini provider", () => {
      const provider = createProvider("gemini", "AIza-test");
      expect(provider.name).toBe("gemini");
    });

    it("throws for unknown provider type", () => {
      expect(() => createProvider("unknown" as LLMProviderType, "key")).toThrow("Unsupported");
    });
  });

  describe("PROVIDER_LABELS", () => {
    it("has labels for all providers", () => {
      expect(PROVIDER_LABELS.openai).toBe("OpenAI");
      expect(PROVIDER_LABELS.claude).toBe("Claude");
      expect(PROVIDER_LABELS.gemini).toBe("Gemini");
    });
  });

  describe("validateKey", () => {
    it("returns error for invalid key (network request fails)", async () => {
      // With a fake key, the API call should fail
      const result = await validateKey("openai", "sk-invalid-key-12345");
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
