import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

const ESCAPE_KEY = "Escape";
const DEFAULT_TITLE = "Are you sure?";
const DEFAULT_CONFIRM_LABEL = "Confirm";
const DEFAULT_CANCEL_LABEL = "Cancel";
const BACKDROP_CLASS =
  "fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4";
const DIALOG_CONTAINER_CLASS =
  "w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out] sm:animate-[scaleIn_0.15s_ease-out]";
const CANCEL_BUTTON_CLASS =
  "flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300";
const CONFIRM_BUTTON_BASE_CLASS =
  "flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2";

/* ── Types ── */
type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
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

  const handleResult = useCallback((result: boolean) => {
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
      />
    );
  }, [state, handleResult]);

  return [confirm, Dialog] as const;
}

/* ── Visual component ── */
const VARIANT_STYLES = {
  danger: {
    icon: "🗑",
    confirm: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
    iconBg: "bg-red-100 text-red-600",
  },
  warning: {
    icon: "⚠️",
    confirm: "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-400",
    iconBg: "bg-amber-100 text-amber-600",
  },
  info: {
    icon: "ℹ️",
    confirm: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
    iconBg: "bg-blue-100 text-blue-600",
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
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const style = VARIANT_STYLES[variant];

  // Auto-focus cancel button (safer default) + Escape to cancel
  const cancelRef = useRef<HTMLButtonElement>(null);
  const didFocus = useRef(false);
  const refCallback = useCallback((el: HTMLButtonElement | null) => {
    (cancelRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    if (el && !didFocus.current) {
      didFocus.current = true;
      requestAnimationFrame(() => el.focus());
    }
  }, []);

  return createPortal(
    <div
      className={BACKDROP_CLASS}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onKeyDown={(e) => { if (e.key === ESCAPE_KEY) { e.stopPropagation(); onCancel(); } }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
        className={DIALOG_CONTAINER_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base ${style.iconBg}`}>
              {style.icon}
            </div>
            <div className="min-w-0">
              <h3 id="confirm-title" className="text-sm font-bold text-gray-900">{title}</h3>
              <p id="confirm-msg" className="mt-1 text-xs text-gray-500 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-4">
          <button
            ref={refCallback}
            onClick={onCancel}
            className={CANCEL_BUTTON_CLASS}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`${CONFIRM_BUTTON_BASE_CLASS} ${style.confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
