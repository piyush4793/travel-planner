import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, TripBrief, TokenUsage } from "../core/types";
import { createProvider } from "../utils/ai/llmProvider";
import { getLLMKeys, getActiveProvider } from "../core/utils/ai/llmSettings";
import {
  buildSystemPrompt,
  condenseMessages,
  buildFinalizationPrompt,
  defaultBrief,
} from "../core/utils/ai/llmPrompts";
import { extractTripPlanResult, type LLMTripPlanResult } from "../core/utils/ai/llmTransform";
import { PROVIDER_LABELS } from "../utils/ai/llmProvider";

// Guardrails to prevent accidental overspend
const MAX_MESSAGES_PER_SESSION = 20;
const MESSAGE_WARNING_THRESHOLD = 16;

function addUsage(prev: TokenUsage, next?: TokenUsage): TokenUsage {
  if (!next) return prev;
  return {
    inputTokens: prev.inputTokens + next.inputTokens,
    outputTokens: prev.outputTokens + next.outputTokens,
    totalTokens: prev.totalTokens + next.totalTokens,
  };
}

type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  finalizing: boolean;
  error: string | null;
  brief: TripBrief;
  finalResult: LLMTripPlanResult | null;
  finished: boolean;
  usageWarning: string | null;
  tokenUsage: TokenUsage;
};

function getProviderAndKey() {
  const keys = getLLMKeys();
  const active = getActiveProvider();
  const key = keys[active];
  if (key) return { provider: active, key };
  // Fallback: try the other provider
  for (const [p, k] of Object.entries(keys)) {
    if (k) return { provider: p as typeof active, key: k };
  }
  return null;
}

export function useChatSession(homeCountry: string) {
  const [state, setState] = useState<ChatState>(() => ({
    messages: [],
    loading: false,
    finalizing: false,
    error: null,
    brief: defaultBrief(homeCountry),
    finalResult: null,
    finished: false,
    usageWarning: null,
    tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  }));

  const fullHistory = useRef<ChatMessage[]>([]);
  const briefRef = useRef(state.brief);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => { briefRef.current = state.brief; }, [state.brief]);

  // Abort in-flight requests on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const sendMessage = useCallback(async (userText: string) => {
    const resolved = getProviderAndKey();
    if (!resolved) {
      setState((s) => ({ ...s, error: "No API key configured. Open Settings to add one." }));
      return;
    }

    // Read current message count from state to avoid stale closure
    let blocked = false;
    setState((s) => {
      const userMsgCount = s.messages.filter((m) => m.role === "user").length;
      if (userMsgCount >= MAX_MESSAGES_PER_SESSION) {
        blocked = true;
        return {
          ...s,
          error: `Message limit reached (${MAX_MESSAGES_PER_SESSION} messages). Click "Finish & Generate Plan" to get your itinerary, or close and start a new chat.`,
        };
      }
      return s;
    });
    if (blocked) return;

    const userMsg: ChatMessage = { role: "user", content: userText };

    const isFirst = fullHistory.current.length === 0;
    if (isFirst) {
      const sysMsg: ChatMessage = { role: "system", content: buildSystemPrompt(homeCountry) };
      fullHistory.current.push(sysMsg);
    }

    fullHistory.current.push(userMsg);

    setState((s) => {
      const userMsgCount = s.messages.filter((m) => m.role === "user").length + 1;
      const remaining = MAX_MESSAGES_PER_SESSION - userMsgCount;
      const usageWarning = remaining <= (MAX_MESSAGES_PER_SESSION - MESSAGE_WARNING_THRESHOLD)
        ? `${remaining} message${remaining !== 1 ? "s" : ""} remaining in this session`
        : null;
      return {
        ...s,
        messages: [...s.messages, userMsg],
        loading: true,
        error: null,
        usageWarning,
      };
    });

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const provider = createProvider(resolved.provider, resolved.key);
      const condensed = condenseMessages(fullHistory.current, briefRef.current);
      const { content, usage } = await provider.chat(condensed, { maxTokens: 16384, signal: controller.signal });

      if (controller.signal.aborted) return;
      const assistantMsg: ChatMessage = { role: "assistant", content };
      fullHistory.current.push(assistantMsg);

      setState((s) => ({
        ...s,
        messages: [...s.messages, assistantMsg],
        loading: false,
        tokenUsage: addUsage(s.tokenUsage, usage),
      }));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Something went wrong.",
      }));
    }
  }, [homeCountry]);

  const finishChat = useCallback(async () => {
    const resolved = getProviderAndKey();
    if (!resolved) return;

    const finMsg: ChatMessage = { role: "user", content: buildFinalizationPrompt() };
    fullHistory.current.push(finMsg);

    setState((s) => ({ ...s, loading: true, finalizing: true, error: null }));

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const provider = createProvider(resolved.provider, resolved.key);
      const condensed = condenseMessages(fullHistory.current, briefRef.current);
      const { content, usage } = await provider.chat(condensed, { maxTokens: 16384, temperature: 0.3, signal: controller.signal });

      if (controller.signal.aborted) return;
      const { result, error } = extractTripPlanResult(content);

      if (result) {
        setState((s) => ({
          ...s,
          loading: false,
          finalizing: false,
          finalResult: result,
          finished: true,
          tokenUsage: addUsage(s.tokenUsage, usage),
        }));
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          finalizing: false,
          error: error ?? "Could not parse the plan. Try asking the AI to refine it, then finish again.",
          tokenUsage: addUsage(s.tokenUsage, usage),
        }));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        loading: false,
        finalizing: false,
        error: e instanceof Error ? e.message : "Failed to finalize the plan.",
      }));
    }
  }, []);

  const clearChat = useCallback(() => {
    fullHistory.current = [];
    setState({
      messages: [],
      loading: false,
      finalizing: false,
      error: null,
      brief: defaultBrief(homeCountry),
      finalResult: null,
      finished: false,
      usageWarning: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
  }, [homeCountry]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const activeLabel = PROVIDER_LABELS[getActiveProvider()];

  return {
    messages: state.messages,
    loading: state.loading,
    finalizing: state.finalizing,
    error: state.error,
    finalResult: state.finalResult,
    finished: state.finished,
    activeProviderLabel: activeLabel,
    usageWarning: state.usageWarning,
    tokenUsage: state.tokenUsage,
    sendMessage,
    finishChat,
    clearChat,
    clearError,
  };
}
