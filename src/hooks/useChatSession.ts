import { useState, useCallback, useRef } from "react";
import type { ChatMessage, TripBrief } from "../types";
import { createProvider } from "../utils/ai/llmProvider";
import { getLLMKeys, getActiveProvider } from "../components/ai/SettingsModal";
import {
  buildSystemPrompt,
  condenseMessages,
  buildFinalizationPrompt,
  defaultBrief,
} from "../utils/ai/llmPrompts";
import { extractTripPlanResult, type LLMTripPlanResult } from "../utils/ai/llmTransform";
import { PROVIDER_LABELS } from "../utils/ai/llmProvider";

type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  brief: TripBrief;
  finalResult: LLMTripPlanResult | null;
  finished: boolean;
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
    error: null,
    brief: defaultBrief(homeCountry),
    finalResult: null,
    finished: false,
  }));

  const fullHistory = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (userText: string) => {
    const resolved = getProviderAndKey();
    if (!resolved) {
      setState((s) => ({ ...s, error: "No API key configured. Open Settings to add one." }));
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: userText };

    const isFirst = fullHistory.current.length === 0;
    if (isFirst) {
      const sysMsg: ChatMessage = { role: "system", content: buildSystemPrompt(homeCountry) };
      fullHistory.current.push(sysMsg);
    }

    fullHistory.current.push(userMsg);

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMsg],
      loading: true,
      error: null,
    }));

    try {
      const provider = createProvider(resolved.provider, resolved.key);
      const condensed = condenseMessages(fullHistory.current, state.brief);
      const response = await provider.chat(condensed);

      const assistantMsg: ChatMessage = { role: "assistant", content: response };
      fullHistory.current.push(assistantMsg);

      setState((s) => ({
        ...s,
        messages: [...s.messages, assistantMsg],
        loading: false,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Something went wrong.",
      }));
    }
  }, [homeCountry, state.brief]);

  const finishChat = useCallback(async () => {
    const resolved = getProviderAndKey();
    if (!resolved) return;

    const finMsg: ChatMessage = { role: "user", content: buildFinalizationPrompt() };
    fullHistory.current.push(finMsg);

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const provider = createProvider(resolved.provider, resolved.key);
      const condensed = condenseMessages(fullHistory.current, state.brief);
      const response = await provider.chat(condensed, { maxTokens: 8192, temperature: 0.3 });

      const { result, error } = extractTripPlanResult(response);

      if (result) {
        setState((s) => ({
          ...s,
          loading: false,
          finalResult: result,
          finished: true,
        }));
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          error: error ?? "Could not parse the plan. Try asking the AI to refine it, then finish again.",
        }));
      }
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to finalize the plan.",
      }));
    }
  }, [state.brief]);

  const clearChat = useCallback(() => {
    fullHistory.current = [];
    setState({
      messages: [],
      loading: false,
      error: null,
      brief: defaultBrief(homeCountry),
      finalResult: null,
      finished: false,
    });
  }, [homeCountry]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const activeLabel = PROVIDER_LABELS[getActiveProvider()];

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    finalResult: state.finalResult,
    finished: state.finished,
    activeProviderLabel: activeLabel,
    sendMessage,
    finishChat,
    clearChat,
    clearError,
  };
}
