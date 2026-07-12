import { describe, it, expect } from "vitest";
import type { TokenUsage, LLMChatResult } from "@/core/types.ts";
import { estimateCost, formatCost, PROVIDER_PRICING } from "@/utils/ai/llmProvider.ts";

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

describe("estimateCost — P1", () => {
  it("calculates cost for openai", () => {
    const cost = estimateCost("openai", 10000, 5000);
    const expected = (10000 / 1e6) * PROVIDER_PRICING.openai.inputPer1M + (5000 / 1e6) * PROVIDER_PRICING.openai.outputPer1M;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it("calculates cost for claude", () => {
    const cost = estimateCost("claude", 10000, 5000);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeGreaterThan(estimateCost("gemini", 10000, 5000));
  });

  it("returns 0 for zero tokens", () => {
    expect(estimateCost("openai", 0, 0)).toBe(0);
  });
});

describe("formatCost — P1", () => {
  it("formats tiny costs", () => {
    expect(formatCost(0.0001)).toBe("<$0.001");
  });

  it("formats small costs with 3 decimals", () => {
    expect(formatCost(0.005)).toBe("~$0.005");
  });

  it("formats normal costs with 2 decimals", () => {
    expect(formatCost(0.15)).toBe("~$0.15");
  });
});

describe("PROVIDER_PRICING — P1", () => {
  it("has pricing for all 3 providers", () => {
    expect(PROVIDER_PRICING.openai).toBeDefined();
    expect(PROVIDER_PRICING.claude).toBeDefined();
    expect(PROVIDER_PRICING.gemini).toBeDefined();
  });

  it("has positive pricing values", () => {
    for (const p of Object.values(PROVIDER_PRICING)) {
      expect(p.inputPer1M).toBeGreaterThan(0);
      expect(p.outputPer1M).toBeGreaterThan(0);
      expect(p.model.length).toBeGreaterThan(0);
    }
  });
});
