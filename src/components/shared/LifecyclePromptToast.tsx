import { memo } from "react";
import type { LifecyclePrompt, LifecyclePromptKind } from "../../hooks/useLifecyclePrompts";

const ICON: Record<LifecyclePromptKind, string> = {
  backup: "💾",
};

type Props = {
  prompt: LifecyclePrompt | null;
  onAct: () => void;
  onDismiss: () => void;
};

/**
 * Soft, non-blocking lifecycle nudge — a bottom-centre toast that never steals
 * focus or blocks the view. Renders nothing when there is no active prompt.
 */
function LifecyclePromptToastInner({ prompt, onAct, onDismiss }: Props) {
  if (!prompt) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur motion-safe:animate-[slideUp_0.2s_ease-out]">
        <span aria-hidden="true" className="text-base leading-none text-emerald-700">{ICON[prompt.kind]}</span>
        <p className="flex-1 text-xs font-medium text-ink-1">{prompt.message}</p>
        {prompt.actionLabel && (
          <button
            type="button"
            onClick={onAct}
            className="focus-ring-emerald min-h-[32px] shrink-0 rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            {prompt.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="focus-ring-emerald flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-3"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );
}

const LifecyclePromptToast = memo(LifecyclePromptToastInner);
export default LifecyclePromptToast;
