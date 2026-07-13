/**
 * Shared bottom-sheet / drawer chrome atoms, so every Plan overlay (the workspace
 * "Insights" and "Tools" sheets, PlanPopover, PlanMenu, PlanFilters, the city
 * jump nav, and the SegmentAdjustDrawer) reads as one family: the same emerald
 * grip band that runs the tint to the rounded top edge, and the same crisp SVG
 * close affordance. Extracted after these drifted into two chrome styles (text-✕
 * generic sheets vs the SVG-✕ branded Adjust drawer) — DRY + a consistent look.
 */

/** The drag-grip band — an emerald tint strip so the sheet's colour reaches the
 *  rounded top edge (the bare grip left a white gap above the header gradient). */
export function SheetGrip({ className = "pb-1 pt-2.5" }: { className?: string }) {
  return (
    <div className={`shrink-0 bg-brand-50 ${className}`}>
      <div className="mx-auto h-1 w-10 rounded-full bg-brand-300/70" aria-hidden="true" />
    </div>
  );
}

/** The crisp round SVG close button shared by every sheet header. */
export function SheetCloseButton({
  onClick,
  label = "Close",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`focus-ring-emerald flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-brand-800 ring-1 ring-brand-100 transition-colors hover:bg-surface-1 ${className}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
