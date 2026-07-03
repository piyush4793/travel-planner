import { useRef } from "react";
import type { LLMProviderType } from "../../../core/types";
import { PROVIDER_LABELS } from "../../../utils/ai/llmProvider";

const PROVIDERS: LLMProviderType[] = ["openai", "claude", "gemini"];

const PROVIDER_ICONS: Record<LLMProviderType, string> = {
  openai: "\u{1F916}",
  claude: "\u{1F9E0}",
  gemini: "\u{1F48E}",
};

type Props = {
  value: LLMProviderType;
  onChange: (p: LLMProviderType) => void;
  /** Provider keys currently stored, to show a "Connected" badge. */
  connected: Partial<Record<LLMProviderType, string>>;
};

/**
 * Visual segmented picker for the active LLM provider. Implements the
 * WAI-ARIA radiogroup pattern (roving tabindex + arrow-key navigation) so it
 * stays keyboard-accessible while looking far more modern than a <select>.
 */
export default function ProviderPicker({ value, onChange, connected }: Props) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next = (idx + 1) % PROVIDERS.length; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); next = (idx - 1 + PROVIDERS.length) % PROVIDERS.length; }
    else return;
    onChange(PROVIDERS[next]);
    btnRefs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="AI provider" className="grid grid-cols-3 gap-2">
      {PROVIDERS.map((p, i) => {
        const selected = p === value;
        const hasKey = !!connected[p];
        return (
          <button
            key={p}
            ref={(el) => { btnRefs.current[i] = el; }}
            role="radio"
            aria-checked={selected}
            aria-label={PROVIDER_LABELS[p] + (hasKey ? " (connected)" : "")}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(p)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={
              "group relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 min-h-[32px] transition-[background-color,box-shadow,border-color,transform] focus-ring ring-1 " +
              (selected
                ? "bg-gradient-to-b from-blue-50 to-indigo-50 ring-2 ring-blue-400 shadow-sm -translate-y-0.5"
                : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 hover:-translate-y-0.5")
            }
          >
            {hasKey && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white"
              >
                {"\u2713"}
              </span>
            )}
            <span aria-hidden="true" className="text-[26px] leading-none transition-transform group-hover:scale-110">{PROVIDER_ICONS[p]}</span>
            <span className={"text-[11px] font-bold " + (selected ? "text-blue-700" : "text-slate-600")}>
              {PROVIDER_LABELS[p]}
            </span>
            <span className={"inline-flex items-center gap-1 text-[9px] font-semibold " + (hasKey ? "text-emerald-600" : "text-slate-400")}>
              {hasKey && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              {hasKey ? "Connected" : "Not set"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { PROVIDER_ICONS };
