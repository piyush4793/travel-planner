import { useState } from "react";
import { createPortal } from "react-dom";
import type { LLMProviderType, LLMKeys } from "../../types";
import { loadLS, saveLS } from "../../utils/storage";
import { LS_KEYS } from "../../utils/lsKeys";
import { validateKey, PROVIDER_LABELS, PROVIDER_PRICING } from "../../utils/ai/llmProvider";

export function getLLMKeys(): LLMKeys {
  return loadLS<LLMKeys>(LS_KEYS.LLM_KEYS, {});
}

export function getActiveProvider(): LLMProviderType {
  return loadLS<LLMProviderType>(LS_KEYS.LLM_PROVIDER, "openai");
}

function saveLLMKeys(keys: LLMKeys) {
  saveLS(LS_KEYS.LLM_KEYS, keys);
}

function saveActiveProvider(p: LLMProviderType) {
  saveLS(LS_KEYS.LLM_PROVIDER, p);
}

const PROVIDERS: LLMProviderType[] = ["openai", "claude", "gemini"];

const PROVIDER_ICONS: Record<LLMProviderType, string> = {
  openai: "🤖",
  claude: "🧠",
  gemini: "💎",
};

const PROVIDER_HELP: Record<LLMProviderType, { placeholder: string; steps: string[] }> = {
  openai: {
    placeholder: "sk-...",
    steps: [
      "Go to platform.openai.com",
      "Sign in or create an account",
      "Navigate to API Keys in your account settings",
      "Click \"Create new secret key\"",
      "Copy and paste it above",
    ],
  },
  claude: {
    placeholder: "sk-ant-...",
    steps: [
      "Go to console.anthropic.com",
      "Sign in or create an account",
      "Navigate to API Keys",
      "Click \"Create Key\"",
      "Copy and paste it above",
    ],
  },
  gemini: {
    placeholder: "AIza...",
    steps: [
      "Go to aistudio.google.com/apikey",
      "Sign in with your Google account",
      "Click \"Create API key\"",
      "Select or create a Google Cloud project",
      "Copy and paste the key above",
    ],
  },
};

type Props = { open: boolean; onClose: () => void; onOpenChat?: () => void };

export default function SettingsModal({ open, onClose, onOpenChat }: Props) {
  const [keys, setKeys] = useState<LLMKeys>(getLLMKeys);
  const [draft, setDraft] = useState("");
  const [provider, setProvider] = useState<LLMProviderType>(getActiveProvider);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  if (!open) return null;

  const currentKey = keys[provider] ?? "";
  const help = PROVIDER_HELP[provider];

  function handleProviderChange(p: LLMProviderType) {
    setProvider(p);
    saveActiveProvider(p);
    setDraft("");
    setStatus(null);
    setShowKey(false);
  }

  async function handleSave() {
    if (!draft.trim()) return;
    setValidating(true);
    setStatus(null);
    const result = await validateKey(provider, draft.trim());
    setValidating(false);
    if (result.ok) {
      const next = { ...keys, [provider]: draft.trim() };
      setKeys(next);
      saveLLMKeys(next);
      setDraft("");
      setStatus({ ok: true, msg: `${PROVIDER_LABELS[provider]} key verified and saved!` });
    } else {
      setStatus({ ok: false, msg: result.error ?? "Validation failed" });
    }
  }

  function handleDelete() {
    const next = { ...keys };
    delete next[provider];
    setKeys(next);
    saveLLMKeys(next);
    setDraft("");
    setStatus({ ok: true, msg: "Key removed." });
  }

  const masked = currentKey ? currentKey.slice(0, 7) + "•".repeat(20) + currentKey.slice(-4) : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="text-lg">⚙️</span> AI Settings
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Provider selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-white/50 uppercase tracking-wide font-medium">Provider</label>
          <div className="relative">
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as LLMProviderType)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/50 hover:border-white/20 transition-colors"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p} className="bg-[#1e1e2e] text-white">
                  {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}{keys[p] ? " ✓" : ""}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none text-xs">▼</span>
          </div>
        </div>

        {/* Current key */}
        {currentKey && (
          <div className="space-y-1.5">
            <label className="text-[11px] text-white/50 uppercase tracking-wide font-medium">Current Key</label>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <code className="text-xs text-emerald-400 flex-1 font-mono">
                {showKey ? currentKey : masked}
              </code>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] text-white/40 hover:text-white/70"
              >
                {showKey ? "Hide" : "Show"}
              </button>
              <button
                onClick={handleDelete}
                className="text-[10px] text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* New key input */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-white/50 uppercase tracking-wide font-medium">
            {currentKey ? "Replace Key" : `${PROVIDER_LABELS[provider]} API Key`}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={help.placeholder}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={!draft.trim() || validating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 disabled:text-white/30 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {validating ? "Verifying…" : "Save"}
            </button>
          </div>
        </div>

        {/* Status */}
        {status && (
          <p className={`text-xs ${status.ok ? "text-emerald-400" : "text-red-400"}`}>
            {status.msg}
          </p>
        )}

        {/* CTA to open chat — always visible when active provider has a key */}
        {currentKey && onOpenChat && (
          <button
            onClick={() => { onClose(); onOpenChat(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            ✨ Start Planning with AI
          </button>
        )}

        {/* Pricing reference */}
        <details className="text-[11px] text-white/50 cursor-pointer">
          <summary className="hover:text-white/70 font-medium">💰 Token pricing reference</summary>
          <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-white/5 text-white/60">
                  <th className="px-3 py-1.5 text-left font-bold">Provider</th>
                  <th className="px-3 py-1.5 text-left font-bold">Model</th>
                  <th className="px-3 py-1.5 text-right font-bold">Input $/1M</th>
                  <th className="px-3 py-1.5 text-right font-bold">Output $/1M</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map((p) => {
                  const pr = PROVIDER_PRICING[p];
                  return (
                    <tr key={p} className={`border-t border-white/5 ${p === provider ? "bg-blue-500/10 text-white/80" : "text-white/40"}`}>
                      <td className="px-3 py-1.5">{PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}</td>
                      <td className="px-3 py-1.5">{pr.model}</td>
                      <td className="px-3 py-1.5 text-right font-mono">${pr.inputPer1M}</td>
                      <td className="px-3 py-1.5 text-right font-mono">${pr.outputPer1M}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-white/30 mt-1">Approximate pricing — check provider dashboards for exact rates</p>
        </details>

        {/* Security notice */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 space-y-1">
          <p className="text-[11px] text-amber-400 font-medium">⚠ Security Notice</p>
          <p className="text-[10px] text-amber-400/70 leading-relaxed">
            Your API key is stored in browser localStorage and used for direct API calls.
            It is never sent to any server other than the selected provider ({PROVIDER_LABELS[provider]}).
            However, it is accessible to browser extensions and dev tools. Use a key with appropriate spending limits.
          </p>
        </div>

        {/* How to get a key */}
        <details className="text-[11px] text-white/40 cursor-pointer">
          <summary className="hover:text-white/60">How to get a {PROVIDER_LABELS[provider]} API key</summary>
          <ol className="mt-2 space-y-1 text-[10px] text-white/30 list-decimal list-inside leading-relaxed">
            {help.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </details>
      </div>
    </div>,
    document.body,
  );
}
