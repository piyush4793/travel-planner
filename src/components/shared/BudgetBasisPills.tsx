import { useRef } from "react";
import { BUDGET_BASIS_ORDER, BUDGET_BASIS_META, type BudgetBasis } from "../../core/utils/budget";

type Props = {
  value: BudgetBasis;
  onChange: (basis: BudgetBasis) => void;
  /** "header" = white-on-accent; "light" = neutral surface. */
  variant?: "header" | "light";
  /** Show the text label beside the icon (defaults to icon-only for compactness). */
  showLabel?: boolean;
  ariaLabel?: string;
};

/**
 * Segmented party-size control (Solo / Couple / Family). Single source of truth
 * for basis iconography, shared by the global Header pill and the Trips toolbar.
 */
export default function BudgetBasisPills({
  value,
  onChange,
  variant = "light",
  showLabel = false,
  ariaLabel = "Budget party size",
}: Props) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next = (idx + 1) % BUDGET_BASIS_ORDER.length; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); next = (idx - 1 + BUDGET_BASIS_ORDER.length) % BUDGET_BASIS_ORDER.length; }
    else return;
    const basis = BUDGET_BASIS_ORDER[next];
    onChange(basis);
    btnRefs.current[next]?.focus();
  }

  const isHeader = variant === "header";
  const groupClass = isHeader
    ? "flex items-center gap-0.5 bg-black/20 rounded-full p-0.5 shrink-0"
    : "flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 shrink-0";

  return (
    <div className={groupClass} role="radiogroup" aria-label={ariaLabel} aria-orientation="horizontal">
      {BUDGET_BASIS_ORDER.map((basis, i) => {
        const meta = BUDGET_BASIS_META[basis];
        const selected = value === basis;
        const activeClass = isHeader ? "bg-white text-blue-700 shadow-sm" : "bg-white text-blue-700 shadow-sm";
        const idleClass = isHeader ? "text-white/80 hover:text-white" : "text-gray-500 hover:text-gray-700";
        return (
          <button
            key={basis}
            ref={(el) => { btnRefs.current[i] = el; }}
            role="radio"
            aria-checked={selected}
            aria-label={meta.label}
            title={meta.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(basis)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`flex items-center justify-center gap-1 min-h-[32px] min-w-[32px] px-2 py-1 rounded-full text-[13px] font-semibold transition-colors focus-ring ${
              selected ? activeClass : idleClass
            }`}
          >
            <span aria-hidden="true">{meta.icon}</span>
            {showLabel && <span className="text-[11px]">{meta.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
