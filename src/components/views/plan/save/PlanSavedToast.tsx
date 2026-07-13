import { memo } from "react";

type Props = {
  /** When true the toast is visible; the caller owns the auto-dismiss timer. */
  open: boolean;
  /** Copy tuned to the route ("trip" / "route"). */
  message: string;
  /** Manual dismiss (the caller also clears its auto-dismiss timer). */
  onClose: () => void;
};

/**
 * Transient "saved to My Trips" confirmation — a soft, non-blocking toast shown
 * briefly when the composed trip is auto-saved on Review, then it fades on its
 * own. Replaces the old *persistent* header tick (a permanent badge for
 * invisible plumbing read as noise). It clears the bottom chrome (the workspace
 * nav bar + app tab bar on mobile, the wizard footer on desktop) so it never
 * lands on top of the Back / Plan-another controls, and carries a close button
 * so it can be dismissed immediately as well as auto-dismissing. Presentational
 * only: the caller owns visibility + the cleaned-up auto-dismiss timer, so it
 * stays trivially testable.
 */
function PlanSavedToastInner({ open, message, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-24"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-brand-200 bg-white/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur motion-safe:animate-[slideUp_0.2s_ease-out]">
        <span aria-hidden="true" className="text-sm leading-none text-brand-600">✓</span>
        <p className="text-xs font-semibold text-brand-900">{message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="focus-ring-emerald flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-brand-50"
        >
          <span aria-hidden="true" className="text-xs leading-none">✕</span>
        </button>
      </div>
    </div>
  );
}

const PlanSavedToast = memo(PlanSavedToastInner);
export default PlanSavedToast;
