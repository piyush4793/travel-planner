import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useChatSession } from "../../hooks/useChatSession";
import type { LLMTripPlanResult } from "../../core/utils/ai/llmTransform";
import { getLLMKeys, getActiveProvider } from "./SettingsModal";
import { parseImportedText, fetchChatLink, importResultToLLM, type ImportResult } from "../../utils/importParser";
import { estimateCost, formatCost, PROVIDER_PRICING } from "../../utils/ai/llmProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  homeCountry: string;
  onPlanReady: (result: LLMTripPlanResult) => void;
  onOpenSettings: () => void;
  initialPrompt?: string;
  autoSend?: boolean;
  onSaveImportedPlan?: (result: LLMTripPlanResult) => void;
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

export default function ChatModal({ open, onClose, homeCountry, onPlanReady, onOpenSettings, initialPrompt, autoSend = true, onSaveImportedPlan }: Props) {
  const { messages, loading, error, finalizing, finalResult, finished, sendMessage, finishChat, clearChat, clearError, activeProviderLabel, usageWarning, tokenUsage } = useChatSession(homeCountry);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSaved, setImportSaved] = useState(false);

  const keys = getLLMKeys();
  const activeProvider = getActiveProvider();
  const hasApiKey = !!keys[activeProvider];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-send or prefill initial prompt
  useEffect(() => {
    if (!open || !initialPrompt || !hasApiKey || messages.length > 0 || loading) return;
    if (autoSentRef.current === initialPrompt) return;
    autoSentRef.current = initialPrompt;
    if (autoSend) {
      sendMessage(initialPrompt);
    } else {
      setInput(initialPrompt);
    }
  }, [open, initialPrompt, hasApiKey, messages.length, loading, sendMessage, autoSend]);

  // Focus input on open
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(id);
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
    setPasteMode(false); setLinkMode(false); setLinkUrl(""); setLinkLoading(false);
    setPasteText(""); setImportResult(null); setImportError(null); setImportSaved(false);
    onClose();
  }

  const hasConversation = messages.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={finalizing ? undefined : handleClose}
    >
      <div
        className="bg-white border border-slate-200 md:rounded-2xl shadow-2xl w-full max-w-none md:max-w-2xl md:mx-4 flex flex-col h-dvh md:h-auto"
        style={{ maxHeight: "min(100dvh, 700px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">✈️</span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">AI Trip Planner</h2>
              <p className="text-[10px] text-slate-400">Powered by {activeProviderLabel} · your key, your tokens</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!pasteMode && !linkMode && !finished && !finalizing && (
              <>
                <button onClick={() => setPasteMode(true)}
                  className="px-2.5 py-1.5 border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 text-[10px] font-semibold rounded-lg transition-colors">
                  📋 Paste
                </button>
                <button onClick={() => setLinkMode(true)}
                  className="px-2.5 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-semibold rounded-lg transition-colors">
                  🔗 Link
                </button>
              </>
            )}
            {hasConversation && !finished && !finalizing && !pasteMode && !linkMode && (
              <FinishButton tokens={tokenUsage.totalTokens} loading={loading} onClick={finishChat} />
            )}
            <button onClick={handleClose} disabled={finalizing} aria-label="Close chat"
              className={`text-lg leading-none p-1 ${finalizing ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-slate-700"}`}>✕</button>
          </div>
        </div>

        {/* Import modes OR regular chat */}
        {(pasteMode || linkMode) ? (
          <ImportView
            mode={pasteMode ? "paste" : "link"}
            pasteText={pasteText} setPasteText={setPasteText}
            linkUrl={linkUrl} setLinkUrl={setLinkUrl}
            linkLoading={linkLoading}
            importResult={importResult} importError={importError}
            saved={importSaved}
            onBack={() => { setPasteMode(false); setLinkMode(false); setImportResult(null); setImportError(null); }}
            onParse={() => {
              const parsed = parseImportedText(pasteText);
              if ("error" in parsed) { setImportError(parsed.error); setImportResult(null); }
              else { setImportResult(parsed); setImportError(null); }
            }}
            onFetchLink={async () => {
              setLinkLoading(true); setImportError(null);
              const fetched = await fetchChatLink(linkUrl);
              setLinkLoading(false);
              if ("error" in fetched) { setImportError(fetched.error); return; }
              const parsed = parseImportedText(fetched.text);
              if ("error" in parsed) { setImportError(parsed.error); return; }
              setImportResult(parsed);
            }}
            onAccept={() => {
              if (importResult && onSaveImportedPlan) {
                const llmResult = importResultToLLM(importResult, homeCountry);
                onSaveImportedPlan(llmResult);
                setImportSaved(true);
              }
            }}
            onSwitchToPaste={() => { setLinkMode(false); setPasteMode(true); setImportError(null); }}
          />
        ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!hasApiKey && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="max-w-md space-y-4">
                <p className="text-sm font-bold text-slate-700 text-center">Choose how to plan your trip</p>
                <button onClick={() => { onClose(); onOpenSettings(); }}
                  className="w-full border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🔑</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Setup API key</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Add your OpenAI / Claude / Gemini key. Your key stays local. Be mindful of token costs.</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setPasteMode(true)}
                  className="w-full border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:bg-violet-50/30 transition-colors text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Paste AI conversation</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Paste the full conversation from ChatGPT, Claude, or Gemini. Free, no key needed.</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setLinkMode(true)}
                  className="w-full border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:bg-amber-50/30 transition-colors text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🔗</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Paste chat link</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Share a ChatGPT or Claude conversation link and we'll parse it automatically.</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {hasApiKey && messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3 max-w-md">
                <span className="text-4xl">🌍</span>
                <p className="text-sm text-slate-500 font-medium">Start planning your trip</p>
                <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line">{PLACEHOLDER}</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-slate-100 text-slate-700 border border-slate-200 rounded-bl-md"
                }`}
              >
                <MessageContent text={msg.content} isUser={msg.role === "user"} />
              </div>
            </div>
          ))}

          {loading && !finalizing && (
            <div className="flex justify-start">
              <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {finalizing && <FinalizingSplash />}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
              <p className="text-xs text-red-600">{error}</p>
              <div className="flex gap-2">
                {error.includes("API key") || error.includes("Invalid") ? (
                  <button
                    onClick={() => { onClose(); onOpenSettings(); }}
                    className="text-[11px] text-emerald-600 hover:text-emerald-500 font-medium"
                  >
                    Open Settings →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
                      if (lastUserMsg) sendMessage(lastUserMsg.content);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-500 font-medium"
                    disabled={loading}
                  >
                    ↻ Retry
                  </button>
                )}
                <button
                  onClick={() => clearError()}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Input — only in regular chat mode */}
        {!pasteMode && !linkMode && !finished && !finalizing && hasApiKey && (
          <div className="px-5 py-3.5 border-t border-slate-200 shrink-0">
            <div className="flex gap-2.5 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your trip…"
                rows={3}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-none max-h-40"
                style={{ minHeight: 72 }}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-300 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                Send
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-[10px] text-slate-400 flex-1">Shift+Enter for new line · Enter to send</p>
              {tokenUsage.totalTokens > 0 && (
                <TokenBadge tokens={tokenUsage.totalTokens} inputTokens={tokenUsage.inputTokens} outputTokens={tokenUsage.outputTokens} />
              )}
              {usageWarning && (
                <p className="text-[10px] text-amber-600 font-medium">{usageWarning}</p>
              )}
            </div>
          </div>
        )}

        {/* Finished state */}
        {finished && (
          <div className="px-5 py-4 border-t border-emerald-200 shrink-0 bg-emerald-50">
            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div className="flex-1">
                <p className="text-sm text-emerald-700 font-medium">Plan generated!</p>
                <p className="text-[11px] text-slate-500">
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
function MessageContent({ text, isUser }: { text: string; isUser?: boolean }) {
  const lines = text.split("\n");
  const headingClass = isUser ? "font-semibold text-white/90" : "font-semibold text-slate-800";
  const bulletClass = isUser ? "text-white/50" : "text-slate-300";
  const numClass = isUser ? "text-white/60" : "text-slate-400";

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        if (trimmed.startsWith("### ")) {
          return <p key={i} className={`${headingClass} mt-2`}>{trimmed.slice(4)}</p>;
        }
        if (trimmed.startsWith("## ")) {
          return <p key={i} className={`${headingClass} font-bold mt-2`}>{trimmed.slice(3)}</p>;
        }

        if (/^[-•*]\s/.test(trimmed)) {
          return (
            <p key={i} className="pl-3 relative">
              <span className={`absolute left-0 ${bulletClass}`}>•</span>
              {renderInline(trimmed.replace(/^[-•*]\s/, ""), isUser)}
            </p>
          );
        }

        if (/^\d+[.)]\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)[.)]\s/)?.[1] ?? "";
          return (
            <p key={i} className="pl-5 relative">
              <span className={`absolute left-0 ${numClass} text-[11px] font-mono`}>{num}.</span>
              {renderInline(trimmed.replace(/^\d+[.)]\s/, ""), isUser)}
            </p>
          );
        }

        return <p key={i}>{renderInline(trimmed, isUser)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string, isUser?: boolean) {
  const boldClass = isUser ? "font-semibold text-white" : "font-semibold text-slate-800";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className={boldClass}>{part.slice(2, -2)}</strong>;
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
        <p className="text-sm text-slate-600 font-medium" key={`t-${step}`} style={{ animation: "fadeInUp 0.4s ease-out" }}>
          {current.text}
        </p>
        <div className="flex justify-center gap-1.5 pt-2">
          {SPLASH_STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === step ? "bg-emerald-500" : "bg-slate-200"}`}
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

function FinishButton({ tokens, loading, onClick }: { tokens: number; loading: boolean; onClick: () => void }) {
  const provider = getActiveProvider();
  // Estimate: "Finish" will send ~2x current tokens (re-sends context + generation prompt + response)
  const estExtraTokens = Math.max(tokens, 2000);
  const estCost = estimateCost(provider, Math.round(estExtraTokens * 0.6), Math.round(estExtraTokens * 0.4));
  const costLabel = tokens > 0 ? ` (${formatCost(estCost)} est.)` : "";

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-300 text-white text-[11px] font-semibold rounded-lg transition-colors"
      title={tokens > 0 ? `This will use ~${formatTokens(estExtraTokens)} additional tokens (${formatCost(estCost)})` : undefined}
    >
      ✓ Finish & Generate{costLabel}
    </button>
  );
}

function TokenBadge({ tokens, inputTokens, outputTokens }: { tokens: number; inputTokens?: number; outputTokens?: number }) {
  const [showTip, setShowTip] = useState(false);
  const color = tokens < 4000 ? "text-emerald-600" : tokens < 12000 ? "text-amber-600" : "text-red-600";
  const provider = getActiveProvider();
  const cost = estimateCost(provider, inputTokens ?? Math.round(tokens * 0.6), outputTokens ?? Math.round(tokens * 0.4));
  const pricing = PROVIDER_PRICING[provider];

  return (
    <span
      className={`text-[10px] font-medium ${color} cursor-help relative`}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      ~{formatTokens(tokens)} tokens · {formatCost(cost)}
      {showTip && (
        <span className="absolute bottom-full right-0 mb-1.5 bg-slate-900 text-white text-[10px] font-normal rounded-lg px-3 py-2 shadow-lg whitespace-nowrap z-50 leading-relaxed">
          <span className="block font-bold mb-1">{pricing.model} pricing</span>
          <span className="block">Input: ${pricing.inputPer1M}/1M tokens</span>
          <span className="block">Output: ${pricing.outputPer1M}/1M tokens</span>
          {inputTokens !== undefined && outputTokens !== undefined && (
            <>
              <span className="block mt-1 border-t border-white/20 pt-1">In: {formatTokens(inputTokens)} · Out: {formatTokens(outputTokens)}</span>
            </>
          )}
          <span className="block mt-0.5 font-semibold text-emerald-400">Est. cost: {formatCost(cost)}</span>
        </span>
      )}
    </span>
  );
}

function PromptSuggestions({ suggestions }: { suggestions: string[] }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  function copyAll() {
    const text = suggestions
      .map((s) => s.replace(/^Ask:\s*/i, "").replace(/^['"]|['"]$/g, ""))
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Improve Your Prompt</p>
        <button onClick={copyAll}
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all ${
            copied ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          }`}>
          {copied ? "✓ Copied" : "📋 Copy All"}
        </button>
      </div>
      {suggestions.map((s, i) => (
        <p key={i} className="text-[11px] text-blue-700 mb-1 last:mb-0">💡 {s}</p>
      ))}
    </div>
  );
}

function ImportView({ mode, pasteText, setPasteText, linkUrl, setLinkUrl, linkLoading, importResult, importError, saved, onBack, onParse, onFetchLink, onAccept, onSwitchToPaste }: {
  mode: "paste" | "link";
  pasteText: string; setPasteText: (t: string) => void;
  linkUrl: string; setLinkUrl: (u: string) => void;
  linkLoading: boolean;
  importResult: ImportResult | null; importError: string | null; saved: boolean;
  onBack: () => void; onParse: () => void; onFetchLink: () => void; onAccept: () => void; onSwitchToPaste: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {!importResult ? (
          <>
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600">← Back</button>
              <p className="text-sm font-bold text-slate-700">
                {mode === "paste" ? "Paste your AI conversation" : "Paste a chat share link"}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {mode === "paste"
                ? "Copy the full chat from ChatGPT, Claude, or Gemini and paste it below."
                : "Paste a ChatGPT or Claude share link below. We'll fetch and parse it."}
            </p>
            {mode === "paste" ? (
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                placeholder={"Paste conversation here...\n\nExample:\nDay 1 — Oslo: Vigeland Park, Opera House\nDay 2 — Bergen: Bryggen Wharf, Fløyen\n..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 resize-none"
                style={{ minHeight: 200 }} />
            ) : (
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://chatgpt.com/share/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-400" />
            )}
            {linkLoading && <p className="text-xs text-slate-500 flex items-center gap-2"><span className="animate-spin">⏳</span>Fetching conversation...</p>}
            {importError && (
              <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
                <p>{importError}</p>
                {mode === "link" && (
                  <button onClick={onSwitchToPaste} className="text-[11px] text-violet-600 hover:text-violet-700 font-semibold">
                    → Paste conversation text manually instead
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-bold text-emerald-800">{importResult.destinationName}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-emerald-600">📅 {importResult.plan.duration}</span>
                <span className="text-xs text-emerald-600">💰 {importResult.plan.costPerPerson}</span>
                <span className="text-xs text-emerald-600">🏙 {importResult.cities.length} cities</span>
              </div>
              {importResult.cities.length > 0 && (
                <p className="text-[11px] text-emerald-600 mt-1">{importResult.cities.join(" → ")}</p>
              )}
            </div>
            {importResult.promptSuggestions.length > 0 && (
              <PromptSuggestions suggestions={importResult.promptSuggestions} />
            )}
            {importResult.plan.days.map((day, i) => (
              <div key={i} className="border border-slate-150 rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{day.label}</p>
                </div>
                <ul className="px-3 py-2 space-y-1">
                  {day.activities.map((a, j) => (
                    <li key={j} className="text-xs text-slate-600 flex gap-2"><span className="text-slate-300">›</span>{a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="px-5 py-4 border-t border-slate-100 shrink-0">
        {!importResult ? (
          <button
            onClick={mode === "paste" ? onParse : onFetchLink}
            disabled={mode === "paste" ? !pasteText.trim() : !linkUrl.trim() || linkLoading}
            className={`w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:bg-slate-200 disabled:text-slate-400 ${
              mode === "paste" ? "bg-violet-600 hover:bg-violet-500" : "bg-amber-600 hover:bg-amber-500"
            }`}>
            {mode === "link" && linkLoading ? "Fetching..." : mode === "paste" ? "Parse Conversation" : "Fetch & Parse"}
          </button>
        ) : saved ? (
          <div className="flex items-center gap-3">
            <span className="text-emerald-600 text-sm font-semibold flex items-center gap-1.5">✅ Plan saved!</span>
            <button onClick={onBack} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">Import Another</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={onBack} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">← Edit</button>
            <button onClick={onAccept} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors">✨ Review & Save</button>
          </div>
        )}
      </div>
    </div>
  );
}
