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

// Guardrails to prevent accidental overspend
const MAX_MESSAGES_PER_SESSION = 20;
const MESSAGE_WARNING_THRESHOLD = 16;

type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  finalizing: boolean;
  error: string | null;
  brief: TripBrief;
  finalResult: LLMTripPlanResult | null;
  finished: boolean;
  usageWarning: string | null;
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
  }));

  const fullHistory = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (userText: string) => {
    const resolved = getProviderAndKey();
    if (!resolved) {
      setState((s) => ({ ...s, error: "No API key configured. Open Settings to add one." }));
      return;
    }

    // Guardrail: limit messages per session
    const userMsgCount = state.messages.filter((m) => m.role === "user").length;
    if (userMsgCount >= MAX_MESSAGES_PER_SESSION) {
      setState((s) => ({
        ...s,
        error: `Message limit reached (${MAX_MESSAGES_PER_SESSION} messages). Click "Finish & Generate Plan" to get your itinerary, or close and start a new chat.`,
      }));
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: userText };

    const isFirst = fullHistory.current.length === 0;
    if (isFirst) {
      const sysMsg: ChatMessage = { role: "system", content: buildSystemPrompt(homeCountry) };
      fullHistory.current.push(sysMsg);
    }

    fullHistory.current.push(userMsg);

    // Usage warning as user approaches limit
    const remaining = MAX_MESSAGES_PER_SESSION - (userMsgCount + 1);
    const usageWarning = remaining <= (MAX_MESSAGES_PER_SESSION - MESSAGE_WARNING_THRESHOLD)
      ? `${remaining} message${remaining !== 1 ? "s" : ""} remaining in this session`
      : null;

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMsg],
      loading: true,
      error: null,
      usageWarning,
    }));

    try {
      const provider = createProvider(resolved.provider, resolved.key);
      const condensed = condenseMessages(fullHistory.current, state.brief);
      const response = await provider.chat(condensed, { maxTokens: 16384 });

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

    setState((s) => ({ ...s, loading: true, finalizing: true, error: null }));

    try {
      const provider = createProvider(resolved.provider, resolved.key);
      const condensed = condenseMessages(fullHistory.current, state.brief);
      const response = await provider.chat(condensed, { maxTokens: 16384, temperature: 0.3 });

      const { result, error } = extractTripPlanResult(response);

      if (result) {
        setState((s) => ({
          ...s,
          loading: false,
          finalizing: false,
          finalResult: result,
          finished: true,
        }));
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          finalizing: false,
          error: error ?? "Could not parse the plan. Try asking the AI to refine it, then finish again.",
        }));
      }
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        finalizing: false,
        error: e instanceof Error ? e.message : "Failed to finalize the plan.",
      }));
    }
  }, [state.brief]);

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
    sendMessage,
    finishChat,
    clearChat,
    clearError,
  };
}
