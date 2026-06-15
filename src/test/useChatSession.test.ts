import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChatSession } from "../hooks/useChatSession";
import { createProvider } from "../utils/ai/llmProvider";
import { getActiveProvider, getLLMKeys } from "../core/utils/ai/llmSettings";

vi.mock("../utils/ai/llmProvider", () => ({
  createProvider: vi.fn(() => ({
    chat: vi.fn().mockResolvedValue({
      content: "AI response",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    }),
  })),
  PROVIDER_LABELS: { openai: "OpenAI", claude: "Claude", gemini: "Gemini" },
}));

vi.mock("../core/utils/ai/llmSettings", () => ({
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
});
