import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChatSession } from "@/hooks/useChatSession.ts";
import { createProvider } from "@/utils/ai/llmProvider.ts";
import { getActiveProvider, getLLMKeys } from "@/core/utils/ai/llmSettings.ts";

vi.mock("@/utils/ai/llmProvider.ts", () => ({
  createProvider: vi.fn(() => ({
    chat: vi.fn().mockResolvedValue({
      content: "AI response",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    }),
  })),
  PROVIDER_LABELS: { openai: "OpenAI", claude: "Claude", gemini: "Gemini" },
}));

vi.mock("@/core/utils/ai/llmSettings.ts", () => ({
  getLLMKeys: vi.fn(() => ({ openai: "test-key" })),
  getActiveProvider: vi.fn(() => "openai"),
}));

describe("useChatSession", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getLLMKeys).mockReturnValue({ openai: "test-key" });
    vi.mocked(getActiveProvider).mockReturnValue("openai");
    vi.mocked(createProvider).mockReturnValue({
      chat: vi.fn().mockResolvedValue({
        content: "AI response",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      }),
    } as never);
  });

  it("starts with an empty, idle chat session", () => {
    const { result } = renderHook(() => useChatSession("India"));

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.activeProviderLabel).toBe("OpenAI");
    expect(result.current.tokenUsage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });

  it("shows an error when no API key is configured", async () => {
    vi.mocked(getLLMKeys).mockReturnValue({});
    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("No API key configured. Open Settings to add one.");
    });
  });

  it("sends a message successfully and appends the AI response", async () => {
    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.sendMessage("Plan me a trip");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0]).toEqual({ role: "user", content: "Plan me a trip" });
    expect(result.current.messages[1]).toEqual({ role: "assistant", content: "AI response" });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.tokenUsage).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15 });
  });

  it("surfaces provider errors", async () => {
    vi.mocked(createProvider).mockReturnValueOnce({
      chat: vi.fn().mockRejectedValue(new Error("Provider failed")),
    } as never);
    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.sendMessage("Plan me a trip");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Provider failed");
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.messages).toEqual([{ role: "user", content: "Plan me a trip" }]);
  });

  it("clears chat state back to defaults", async () => {
    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.sendMessage("Plan me a trip");
    });
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.finished).toBe(false);
    expect(result.current.finalResult).toBeNull();
    expect(result.current.tokenUsage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });

  it("clears an existing error", async () => {
    vi.mocked(getLLMKeys).mockReturnValue({});
    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.sendMessage("Hello");
    });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("falls back to another provider's key when the active provider has none", async () => {
    vi.mocked(getLLMKeys).mockReturnValue({ openai: "", claude: "claude-key" } as never);
    vi.mocked(getActiveProvider).mockReturnValue("openai");
    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.sendMessage("Plan me a trip");
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(createProvider).toHaveBeenCalledWith("claude", "claude-key");
    expect(result.current.error).toBeNull();
  });

  it("shows a usage warning near the limit and blocks past the message cap", async () => {
    const { result } = renderHook(() => useChatSession("India"));

    // Drive up to the 20-message cap.
    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await result.current.sendMessage(`msg ${i}`);
      });
    }

    await waitFor(() => expect(result.current.usageWarning).toBeTruthy());
    expect(String(result.current.usageWarning)).toContain("remaining in this session");

    // The 21st user message exercises the message-cap guard branch.
    await act(async () => {
      await result.current.sendMessage("one too many");
    });
    expect(result.current.usageWarning).toBeTruthy();
  });

  it("does nothing on finishChat when no API key is configured", async () => {
    vi.mocked(getLLMKeys).mockReturnValue({});
    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.finishChat();
    });

    expect(result.current.finished).toBe(false);
    expect(result.current.finalResult).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("finalizes the chat into a parsed plan result", async () => {
    const planJson = JSON.stringify({
      destinationName: "Japan",
      originCountry: "India",
      travelers: 2,
      durationDays: 3,
      budgetLevel: "mid-range",
      assumptions: [],
      cities: [{ name: "Tokyo", lat: 35.6, lng: 139.7, nights: 3 }],
      meta: { bestMonths: [], worstMonths: [], thingsToAvoid: [], comboCountries: [], highlights: [] },
      plan: {
        duration: "3 days",
        costPerPerson: "$1000",
        days: [{ label: "Day 1 — Tokyo", activities: ["Shibuya"] }],
        note: "",
      },
    });
    vi.mocked(createProvider).mockReturnValue({
      chat: vi.fn().mockResolvedValue({
        content: planJson,
        usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
      }),
    } as never);

    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.finishChat();
    });

    await waitFor(() => expect(result.current.finished).toBe(true));
    expect(result.current.finalResult?.destinationName).toBe("Japan");
    expect(result.current.finalizing).toBe(false);
    expect(result.current.tokenUsage.totalTokens).toBe(30);
  });

  it("surfaces a parse error when finalization output is not a valid plan", async () => {
    vi.mocked(createProvider).mockReturnValue({
      chat: vi.fn().mockResolvedValue({
        content: "sorry, I could not build a plan",
        usage: { inputTokens: 5, outputTokens: 2, totalTokens: 7 },
      }),
    } as never);

    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.finishChat();
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.finished).toBe(false);
    expect(result.current.finalizing).toBe(false);
  });

  it("surfaces provider errors during finalization", async () => {
    vi.mocked(createProvider).mockReturnValue({
      chat: vi.fn().mockRejectedValue(new Error("finalize boom")),
    } as never);

    const { result } = renderHook(() => useChatSession("India"));

    await act(async () => {
      await result.current.finishChat();
    });

    await waitFor(() => expect(result.current.error).toBe("finalize boom"));
    expect(result.current.finalizing).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});
