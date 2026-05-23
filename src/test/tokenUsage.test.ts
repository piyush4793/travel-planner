import { describe, it, expect } from "vitest";
import type { TokenUsage, LLMChatResult } from "../types";

describe("TokenUsage type — P0", () => {
  it("represents token counts correctly", () => {
    const usage: TokenUsage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
    expect(usage.totalTokens).toBe(150);
  });

  it("LLMChatResult includes content and optional usage", () => {
    const withUsage: LLMChatResult = {
      content: "Hello",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    };
    expect(withUsage.content).toBe("Hello");
    expect(withUsage.usage?.totalTokens).toBe(15);

    const withoutUsage: LLMChatResult = { content: "Hello" };
    expect(withoutUsage.usage).toBeUndefined();
  });
});

describe("Token accumulation logic — P1", () => {
  function addUsage(prev: TokenUsage, next?: TokenUsage): TokenUsage {
    if (!next) return prev;
    return {
      inputTokens: prev.inputTokens + next.inputTokens,
      outputTokens: prev.outputTokens + next.outputTokens,
      totalTokens: prev.totalTokens + next.totalTokens,
    };
  }

  const ZERO: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  it("returns prev when next is undefined", () => {
    const prev: TokenUsage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
    expect(addUsage(prev, undefined)).toEqual(prev);
  });

  it("accumulates tokens across calls", () => {
    let total = ZERO;
    total = addUsage(total, { inputTokens: 100, outputTokens: 50, totalTokens: 150 });
    total = addUsage(total, { inputTokens: 200, outputTokens: 80, totalTokens: 280 });
    expect(total).toEqual({ inputTokens: 300, outputTokens: 130, totalTokens: 430 });
  });

  it("handles zero-token responses", () => {
    const prev: TokenUsage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
    const result = addUsage(prev, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    expect(result).toEqual(prev);
  });

  it("starts from zero correctly", () => {
    const result = addUsage(ZERO, { inputTokens: 500, outputTokens: 200, totalTokens: 700 });
    expect(result).toEqual({ inputTokens: 500, outputTokens: 200, totalTokens: 700 });
  });
});
