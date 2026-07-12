import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProvider,
  estimateCost,
  formatCost,
  PROVIDER_LABELS,
  PROVIDER_PRICING,
  validateKey,
} from "@/utils/ai/llmProvider.ts";

type MockResponseOptions = {
  ok: boolean;
  status?: number;
  json?: unknown;
  text?: string;
};

function mockResponse({ ok, status = 200, json, text = "" }: MockResponseOptions): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(json),
    text: vi.fn().mockResolvedValue(text),
  } as unknown as Response;
}

describe("llmProvider — P1", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn() as typeof fetch;
  });

  describe("createProvider factory", () => {
    it("creates providers for each supported type", () => {
      expect(createProvider("openai", "key").name).toBe("openai");
      expect(createProvider("claude", "key").name).toBe("claude");
      expect(createProvider("gemini", "key").name).toBe("gemini");
    });

    it("throws for an unsupported provider", () => {
      expect(() => createProvider("invalid" as any, "key")).toThrow("Unsupported provider: invalid");
    });
  });

  it("exposes provider labels and pricing metadata", () => {
    expect(PROVIDER_LABELS).toMatchObject({ openai: "OpenAI", claude: "Claude", gemini: "Gemini" });
    expect(PROVIDER_PRICING.openai).toEqual(expect.objectContaining({ model: expect.any(String), inputPer1M: 0.15, outputPer1M: 0.6 }));
    expect(PROVIDER_PRICING.claude).toEqual(expect.objectContaining({ model: expect.any(String), inputPer1M: expect.any(Number), outputPer1M: expect.any(Number) }));
    expect(PROVIDER_PRICING.gemini).toEqual(expect.objectContaining({ model: expect.any(String), inputPer1M: expect.any(Number), outputPer1M: expect.any(Number) }));
  });

  it("estimates and formats costs", () => {
    expect(estimateCost("openai", 1_000_000, 1_000_000)).toBe(0.75);
    expect(formatCost(0.0001)).toBe("<$0.001");
    expect(formatCost(0.005)).toBe("~$0.005");
    expect(formatCost(1.23)).toBe("~$1.23");
  });

  describe("validateKey", () => {
    it("returns ok true for a successful validation", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({
        ok: true,
        json: { choices: [{ message: { content: "hello" } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
      }));

      await expect(validateKey("openai", "key")).resolves.toEqual({ ok: true });
    });

    it("returns a network error message when fetch fails", async () => {
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

      const result = await validateKey("openai", "key");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("surfaces invalid API key errors", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({ ok: false, status: 401, text: "Unauthorized" }));

      const result = await validateKey("openai", "key");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });
  });

  describe("provider.chat", () => {
    it("returns content and normalized usage for OpenAI", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({
        ok: true,
        json: { choices: [{ message: { content: "hello" } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
      }));

      const provider = createProvider("openai", "key");
      await expect(provider.chat([{ role: "user", content: "hi" }])).resolves.toEqual({
        content: "hello",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });
    });

    it("throws friendly OpenAI auth and quota errors", async () => {
      const provider = createProvider("openai", "key");

      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({ ok: false, status: 401, text: "Unauthorized" }));
      await expect(provider.chat([{ role: "user", content: "hi" }])).rejects.toThrow("Invalid API key");

      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({ ok: false, status: 429, text: "insufficient_quota" }));
      await expect(provider.chat([{ role: "user", content: "hi" }])).rejects.toThrow("quota exceeded");
    });

    it("returns content and usage for Claude", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({
        ok: true,
        json: { content: [{ type: "text", text: "hello" }], usage: { input_tokens: 10, output_tokens: 5 } },
      }));

      const provider = createProvider("claude", "key");
      await expect(provider.chat([
        { role: "system", content: "system" },
        { role: "user", content: "hi" },
      ])).resolves.toEqual({
        content: "hello",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });
    });

    it("returns content and usage for Gemini", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({
        ok: true,
        json: {
          candidates: [{ content: { parts: [{ text: "hello" }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        },
      }));

      const provider = createProvider("gemini", "key");
      await expect(provider.chat([
        { role: "system", content: "system" },
        { role: "user", content: "hi" },
      ])).resolves.toEqual({
        content: "hello",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });
    });

    it("passes the caller's AbortSignal through to fetch", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({
        ok: true,
        json: { choices: [{ message: { content: "ok" } }] },
      }));
      const controller = new AbortController();
      const provider = createProvider("openai", "key");
      await provider.chat([{ role: "user", content: "hi" }], { signal: controller.signal });

      const init = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("rejects with a timeout error when the request exceeds timeoutMs", async () => {
      // fetch that rejects only when its signal aborts (mimics a hung request).
      vi.mocked(globalThis.fetch).mockImplementationOnce((_url, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject((init.signal as AbortSignal).reason ?? new DOMException("Aborted", "AbortError")),
          );
        }) as Promise<Response>,
      );
      const provider = createProvider("openai", "key");
      await expect(
        provider.chat([{ role: "user", content: "hi" }], { timeoutMs: 10 }),
      ).rejects.toThrow(/timed out/i);
    });

    it("aborts the in-flight fetch when the caller signal aborts", async () => {
      const controller = new AbortController();
      vi.mocked(globalThis.fetch).mockImplementationOnce((_url, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject((init.signal as AbortSignal).reason ?? new DOMException("Aborted", "AbortError")),
          );
        }) as Promise<Response>,
      );
      const provider = createProvider("openai", "key");
      const p = provider.chat([{ role: "user", content: "hi" }], { signal: controller.signal });
      controller.abort();
      await expect(p).rejects.toBeInstanceOf(DOMException);
    });
  });
});
