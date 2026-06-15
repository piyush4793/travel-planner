import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLLMKeys,
  saveLLMKeys,
  getActiveProvider,
  saveActiveProvider,
} from "../core/utils/ai/llmSettings";

describe("llmSettings — P0", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("getLLMKeys returns an empty object when nothing is stored", () => {
    expect(getLLMKeys()).toEqual({});
  });

  it("saveLLMKeys persists keys and getLLMKeys retrieves them", () => {
    const keys = {
      openai: "sk-test-openai",
      claude: "sk-ant-test-claude",
      gemini: "AIza-test-gemini",
    };

    saveLLMKeys(keys);

    expect(getLLMKeys()).toEqual(keys);
  });

  it("getActiveProvider defaults to openai", () => {
    expect(getActiveProvider()).toBe("openai");
  });

  it("saveActiveProvider persists and reads back the active provider", () => {
    saveActiveProvider("claude");

    expect(getActiveProvider()).toBe("claude");
  });
});
