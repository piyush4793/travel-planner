import { useState, useCallback, useRef } from "react";
import type { ChatMessage, TripBrief } from "../types";
import { createProvider } from "../utils/ai/llmProvider";
import { getLLMKeys } from "../components/ai/SettingsModal";
import {
  buildSystemPrompt,
  condenseMessages,
  buildFinalizationPrompt,
  defaultBrief,
} from "../utils/ai/llmPrompts";
import { extractTripPlanResult, type LLMTripPlanResult } from "../utils/ai/llmTransform";

type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  brief: TripBrief;
  finalResult: LLMTripPlanResult | null;
  finished: boolean;
};

export function useChatSession(homeCountry: string) {
  const [state, setState] = useState<ChatState>(() => ({
    messages: [],
    loading: false,
    error: null,
    brief: defaultBrief(homeCountry),
    finalResult: null,
    finished: false,
  }));

  // Track full message history separately from condensed messages sent to LLM
  const fullHistory = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (userText: string) => {
    const keys = getLLMKeys();
    const apiKey = keys.openai;
    if (!apiKey) {
      setState((s) => ({ ...s, error: "No API key configured. Open Settings to add one." }));
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: userText };

    // Build system message on first call
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
      const provider = createProvider("openai", apiKey);
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
    const keys = getLLMKeys();
    const apiKey = keys.openai;
    if (!apiKey) return;

    const finMsg: ChatMessage = { role: "user", content: buildFinalizationPrompt() };
    fullHistory.current.push(finMsg);

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const provider = createProvider("openai", apiKey);
      const condensed = condenseMessages(fullHistory.current, state.brief);
      const response = await provider.chat(condensed, { maxTokens: 4096, temperature: 0.3 });

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

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    finalResult: state.finalResult,
    finished: state.finished,
    sendMessage,
    finishChat,
    clearChat,
    clearError,
  };
}
