import { useState, useCallback } from "react";
import ModalShell from "./ModalShell";

const DEFAULT_TITLE = "Are you sure?";
const DEFAULT_CONFIRM_LABEL = "Confirm";
const DEFAULT_CANCEL_LABEL = "Cancel";
const DIALOG_CONTAINER_CLASS =
  "w-full max-w-sm self-end sm:self-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden focus:outline-none motion-safe:animate-[slideUp_0.2s_ease-out] sm:motion-safe:animate-[scaleIn_0.15s_ease-out]";
const CANCEL_BUTTON_CLASS =
  "flex-1 min-h-[40px] px-4 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors focus-ring";
const CONFIRM_BUTTON_BASE_CLASS =
  "flex-1 min-h-[40px] px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors focus-ring";

/* ── Types ── */
type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "emerald";
  /**
   * Called when the dialog is dismissed via Escape or backdrop click (NOT the
   * explicit cancel button). The promise still resolves `false` either way, so
   * boolean callers are unaffected; callers that need to tell "cancel button" from
   * "dismissed" can observe this side-channel.
   */
  onDismiss?: () => void;
};

type ConfirmState = ConfirmOptions & { resolve: (v: boolean) => void };

/* ── Hook: useConfirm ── */
/**
 * Promise-based confirm dialog hook.
 * Returns [confirm, ConfirmDialogPortal].
 *
 * Usage:
 *   const [confirm, ConfirmDialog] = useConfirm();
 *   if (await confirm({ message: "Delete?" })) { … }
 *   // Render <ConfirmDialog /> in your component tree
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleResult = useCallback((result: boolean, dismissed = false) => {
    if (dismissed) state?.onDismiss?.();
    state?.resolve(result);
    setState(null);
  }, [state]);

  const Dialog = useCallback(() => {
    if (!state) return null;
    return (
      <ConfirmDialogView
        {...state}
        onConfirm={() => handleResult(true)}
        onCancel={() => handleResult(false)}
        onDismiss={() => handleResult(false, true)}
      />
    );
  }, [state, handleResult]);

  return [confirm, Dialog] as const;
}

/* ── Visual component ── */
const VARIANT_STYLES = {
  danger: {
    icon: "🗑",
    confirm: "bg-red-600 text-white hover:bg-red-700",
    iconBg: "bg-red-100 text-red-600",
  },
  warning: {
    icon: "⚠️",
    confirm: "bg-amber-600 text-white hover:bg-amber-700",
    iconBg: "bg-amber-100 text-amber-600",
  },
  info: {
    icon: "ℹ️",
    confirm: "bg-emerald-700 text-white hover:bg-emerald-800",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  emerald: {
    icon: "🧳",
    confirm: "bg-emerald-600 text-white hover:bg-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
};

function ConfirmDialogView({
  title = DEFAULT_TITLE,
  message,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  cancelLabel = DEFAULT_CANCEL_LABEL,
  variant = "danger",
  onConfirm,
  onCancel,
  onDismiss,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void; onDismiss: () => void }) {
  const style = VARIANT_STYLES[variant];

  // ModalShell owns focus-trap, focus-restore-to-opener, scroll-lock, Escape and
  // device-Back (all a11y-critical for an alertdialog). It auto-focuses the first
  // focusable element — Cancel is first in the DOM, the safer default.
  return (
    <ModalShell
      open
      onClose={onDismiss}
      role="alertdialog"
      labelledBy="confirm-title"
      describedBy="confirm-msg"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      className={DIALOG_CONTAINER_CLASS}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base ${style.iconBg}`} aria-hidden="true">
            {style.icon}
          </div>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-sm font-bold text-gray-900">{title}</h3>
            <p id="confirm-msg" className="mt-1 text-xs text-gray-500 leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 px-5 pb-4">
        <button onClick={onCancel} className={CANCEL_BUTTON_CLASS}>
          {cancelLabel}
        </button>
        <button onClick={onConfirm} className={`${CONFIRM_BUTTON_BASE_CLASS} ${style.confirm}`}>
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
