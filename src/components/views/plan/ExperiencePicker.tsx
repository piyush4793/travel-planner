import { useState } from "react";

/**
 * Default number of vibe pills to reveal before the rest collapse behind a
 * "+N more" toggle. A UX preference, not a layout safeguard: the pill area is
 * height-bounded and scrollable, so any count — a raised cap or
 * `Number.POSITIVE_INFINITY` to disable capping — stays contained. Ten is a
 * balanced 2–3 rows; any *selected* tag stays visible even past the cap.
 */
export const DEFAULT_VIBE_CAP = 10;

type Props = {
  /** All available vibe tags (a single unit's, or a multi-unit union). */
  experiences: string[];
  selectedExperiences: string[];
  onToggleExperience: (exp: string) => void;
  onClearExperiences: () => void;
  /**
   * Pills to reveal before collapsing behind "+N more". Defaults to
   * {@link DEFAULT_VIBE_CAP}; pass `Number.POSITIVE_INFINITY` to render all
   * (the scroll container keeps the layout safe regardless).
   */
  visibleCap?: number;
  /** Tighter pills for compact hosts (e.g. the Places-step Filters popover). */
  dense?: boolean;
};

/**
 * Shared vibe (experience) picker — the single source of the toggle-chip UI used
 * by both Trip Basics and the Places "Refine" surface. Progressive disclosure
 * caps the visible pills; a height-bounded scroll container is the real layout
 * guard, so the cap is purely a density preference and a *selected* tag is never
 * hidden past it. Presentation only — all state is owned by the caller.
 */
export default function ExperiencePicker({
  experiences,
  selectedExperiences,
  onToggleExperience,
  onClearExperiences,
  visibleCap = DEFAULT_VIBE_CAP,
  dense = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const overflow = experiences.length > visibleCap;
  const visible =
    expanded || !overflow
      ? experiences
      : experiences.filter((exp, i) => i < visibleCap || selectedExperiences.includes(exp));
  const hiddenCount = experiences.length - visible.length;
  const toggleLabel = expanded ? "Show less" : hiddenCount > 0 ? `+${hiddenCount} more` : null;
  const pillSize = dense ? "min-h-[32px] px-3 py-1 text-[12px]" : "min-h-[38px] px-3.5 py-1.5 text-[13px]";

  return (
    <div>
      <div className="-mx-1 max-h-56 overflow-y-auto overscroll-contain px-1">
        <div className="flex flex-wrap justify-center gap-2">
          {visible.map((exp) => {
            const active = selectedExperiences.includes(exp);
            return (
              <button
                key={exp}
                onClick={() => onToggleExperience(exp)}
                aria-pressed={active}
                className={`focus-ring-emerald rounded-full border ${pillSize} transition-[transform,box-shadow,border-color,color] ${
                  active
                    ? "border-emerald-700 bg-emerald-700 font-semibold text-white shadow-sm"
                    : "border-[#e7e1d2] bg-white font-medium text-[#3c463f] hover:border-emerald-500 hover:text-emerald-800"
                }`}
              >
                {exp}
              </button>
            );
          })}
        </div>
      </div>
      {toggleLabel && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="focus-ring-emerald min-h-[32px] rounded-full border border-dashed border-[#cbbfa6] bg-transparent px-3.5 py-1.5 text-[12px] font-semibold text-[#6f6a5d] transition-colors hover:border-emerald-500 hover:text-emerald-800"
          >
            {toggleLabel}
          </button>
        </div>
      )}
      <div className="mt-3 flex h-5 items-center justify-center">
        {selectedExperiences.length > 0 && (
          <button
            onClick={onClearExperiences}
            className="focus-ring-emerald rounded text-[11px] font-semibold text-[#a09a89] transition-colors hover:text-[#6f6a5d]"
          >
            Clear ({selectedExperiences.length})
          </button>
        )}
      </div>
    </div>
  );
}
