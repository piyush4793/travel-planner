import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useChatSession } from "../../hooks/useChatSession";
import type { LLMTripPlanResult } from "../../utils/ai/llmTransform";
import { getLLMKeys, getActiveProvider } from "./SettingsModal";

type Props = {
  open: boolean;
  onClose: () => void;
  homeCountry: string;
  onPlanReady: (result: LLMTripPlanResult) => void;
  onOpenSettings: () => void;
  initialPrompt?: string;
};

const PLACEHOLDER = `Describe your trip — for example:
"Plan a 10-day trip to Norway for 2 people in September, mid-range budget. Must visit Bergen and Tromsø."

Include any of these for better results:
• Where from → Where to (can be multiple countries)
• Number of travelers
• Number of days
• Budget preference (budget / mid-range / luxury)
• Mandatory cities to cover
• Any preferences or things to avoid`;

export default function ChatModal({ open, onClose, homeCountry, onPlanReady, onOpenSettings, initialPrompt }: Props) {
  const { messages, loading, error, finalizing, finalResult, finished, sendMessage, finishChat, clearChat, clearError, activeProviderLabel, usageWarning, tokenUsage } = useChatSession(homeCountry);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef<string | null>(null);

  const keys = getLLMKeys();
  const activeProvider = getActiveProvider();
  const hasApiKey = !!keys[activeProvider];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-send initial prompt (guarded against duplicates)
  useEffect(() => {
    if (open && initialPrompt && hasApiKey && messages.length === 0 && !loading && autoSentRef.current !== initialPrompt) {
      autoSentRef.current = initialPrompt;
      sendMessage(initialPrompt);
    }
  }, [open, initialPrompt, hasApiKey, messages.length, loading, sendMessage]);

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  function handleViewItinerary() {
    if (finalResult) onPlanReady(finalResult);
    handleClose();
  }

  if (!open) return null;

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClose() {
    clearChat();
    autoSentRef.current = null;
    onClose();
  }

  const hasConversation = messages.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={finalizing ? undefined : handleClose}
    >
      <div
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col"
        style={{ height: "min(80vh, 700px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">✈️</span>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Trip Planner</h2>
              <p className="text-[10px] text-white/40">Powered by {activeProviderLabel} · your key, your tokens</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasConversation && !finished && !finalizing && (
              <button
                onClick={finishChat}
                disabled={loading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 disabled:text-white/30 text-white text-[11px] font-semibold rounded-lg transition-colors"
              >
                ✓ Finish & Generate Plan
              </button>
            )}
            <button onClick={handleClose} disabled={finalizing}
              className={`text-lg leading-none p-1 ${finalizing ? "text-white/10 cursor-not-allowed" : "text-white/40 hover:text-white"}`}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!hasApiKey && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-sm">
                <span className="text-4xl">🔑</span>
                <p className="text-sm text-white/70 font-medium">API key required</p>
                <p className="text-[11px] text-white/35 leading-relaxed">
                  Add your OpenAI API key in Settings to start using the AI trip planner. Your key stays local and is never shared.
                </p>
                <button
                  onClick={() => { onClose(); onOpenSettings(); }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Open Settings →
                </button>
              </div>
            </div>
          )}

          {hasApiKey && messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3 max-w-md">
                <span className="text-4xl">🌍</span>
                <p className="text-sm text-white/60 font-medium">Start planning your trip</p>
                <p className="text-[11px] text-white/30 leading-relaxed whitespace-pre-line">{PLACEHOLDER}</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white/8 text-white/85 border border-white/8 rounded-bl-md"
                }`}
              >
                <MessageContent text={msg.content} />
              </div>
            </div>
          ))}

          {loading && !finalizing && (
            <div className="flex justify-start">
              <div className="bg-white/8 border border-white/8 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {finalizing && <FinalizingSplash />}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 space-y-2">
              <p className="text-xs text-red-400">{error}</p>
              <div className="flex gap-2">
                {error.includes("API key") || error.includes("Invalid") ? (
                  <button
                    onClick={() => { onClose(); onOpenSettings(); }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Open Settings →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
                      if (lastUserMsg) sendMessage(lastUserMsg.content);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                    disabled={loading}
                  >
                    ↻ Retry
                  </button>
                )}
                <button
                  onClick={() => clearError()}
                  className="text-[11px] text-white/30 hover:text-white/50 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        {!finished && !finalizing && hasApiKey && (
          <div className="px-5 py-3.5 border-t border-white/10 shrink-0">
            <div className="flex gap-2.5 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your trip…"
                rows={1}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 resize-none max-h-32"
                style={{ minHeight: 42 }}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                Send
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-[10px] text-white/20 flex-1">Shift+Enter for new line · Enter to send</p>
              {tokenUsage.totalTokens > 0 && (
                <TokenBadge tokens={tokenUsage.totalTokens} />
              )}
              {usageWarning && (
                <p className="text-[10px] text-amber-400/70 font-medium">{usageWarning}</p>
              )}
            </div>
          </div>
        )}

        {/* Finished state */}
        {finished && (
          <div className="px-5 py-4 border-t border-white/10 shrink-0 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div className="flex-1">
                <p className="text-sm text-emerald-400 font-medium">Plan generated!</p>
                <p className="text-[11px] text-white/40">
                  {finalResult?.destinationName} · {finalResult?.durationDays} days · {finalResult?.budgetLevel}
                  {tokenUsage.totalTokens > 0 && ` · ${formatTokens(tokenUsage.totalTokens)} tokens`}
                </p>
              </div>
              <button
                onClick={handleViewItinerary}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                View Itinerary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Render assistant messages with basic markdown-like formatting */
function MessageContent({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        // Bold headers (###, **, etc.)
        if (trimmed.startsWith("### ")) {
          return <p key={i} className="font-semibold text-white/90 mt-2">{trimmed.slice(4)}</p>;
        }
        if (trimmed.startsWith("## ")) {
          return <p key={i} className="font-bold text-white/95 mt-2">{trimmed.slice(3)}</p>;
        }

        // Bullet points
        if (/^[-•*]\s/.test(trimmed)) {
          return (
            <p key={i} className="pl-3 relative">
              <span className="absolute left-0 text-white/30">•</span>
              {renderInline(trimmed.replace(/^[-•*]\s/, ""))}
            </p>
          );
        }

        // Numbered list
        if (/^\d+[.)]\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)[.)]\s/)?.[1] ?? "";
          return (
            <p key={i} className="pl-5 relative">
              <span className="absolute left-0 text-white/40 text-[11px] font-mono">{num}.</span>
              {renderInline(trimmed.replace(/^\d+[.)]\s/, ""))}
            </p>
          );
        }

        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

/** Render **bold** inline text */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white/95">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

const SPLASH_STEPS = [
  { emoji: "🧠", text: "Analyzing your preferences…" },
  { emoji: "🗺️", text: "Mapping the best route…" },
  { emoji: "📅", text: "Building day-by-day itinerary…" },
  { emoji: "💰", text: "Estimating costs…" },
  { emoji: "🏨", text: "Finding accommodation options…" },
  { emoji: "✨", text: "Polishing your trip plan…" },
];

function FinalizingSplash() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % SPLASH_STEPS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const current = SPLASH_STEPS[step];

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-5 animate-pulse">
        <span className="text-5xl block" key={step} style={{ animation: "fadeInUp 0.4s ease-out" }}>
          {current.emoji}
        </span>
        <p className="text-sm text-white/70 font-medium" key={`t-${step}`} style={{ animation: "fadeInUp 0.4s ease-out" }}>
          {current.text}
        </p>
        <div className="flex justify-center gap-1.5 pt-2">
          {SPLASH_STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === step ? "bg-emerald-400" : "bg-white/15"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function TokenBadge({ tokens }: { tokens: number }) {
  const color = tokens < 4000 ? "text-emerald-400/60" : tokens < 12000 ? "text-amber-400/60" : "text-red-400/60";
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      ~{formatTokens(tokens)} tokens
    </span>
  );
}
