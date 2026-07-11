import { BUDGET_BASIS_META, BUDGET_BASIS_ORDER, type BudgetBasis } from "../../../core/utils/budget";
import PlanMenu from "./PlanMenu";

const CARET = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-70">
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Visual skin: `dark` for white-on-emerald surfaces, `light` for the ivory header. */
type Variant = "dark" | "light";

const TRIGGER: Record<Variant, string> = {
  dark: "flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/15 focus-ring-emerald",
  light:
    "flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1.5 text-[13px] text-ink-1 transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus-ring-emerald",
};

type Props = {
  basis: BudgetBasis;
  setBasis: (b: BudgetBasis) => void;
  variant?: Variant;
  /** Prefix the trigger with a small "Who's going" hint (header context). */
  labelled?: boolean;
  /** Collapse the trigger to the party-size emoji only (compact mobile header) —
   *  the label is dropped visually but stays available via the aria-label. */
  iconOnly?: boolean;
};

const ICON_TRIGGER: Record<Variant, string> = {
  dark: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[15px] text-white transition-colors hover:bg-white/15 focus-ring-emerald",
  light:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-[15px] text-ink-1 transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus-ring-emerald",
};

/**
 * The single "who's going" (party-size) control, shared verbatim across every
 * Plan surface — the unified header, the Places header, and the Route Canvas
 * levers bar — so the basis reads and behaves identically everywhere (SOLID/DRY:
 * one control, one behaviour). Rescaling the basis reflows every stop's budget.
 * Reuses the portal `PlanMenu` for viewport-collision, Escape/back close, and
 * focus return.
 */
export default function BasisMenu({ basis, setBasis, variant = "dark", labelled = false, iconOnly = false }: Props) {
  const meta = BUDGET_BASIS_META[basis];
  return (
    <PlanMenu
      ariaLabel={`Who's going — ${meta.label}`}
      title="Who's going"
      icon="👥"
      width={220}
      triggerClassName={iconOnly ? ICON_TRIGGER[variant] : TRIGGER[variant]}
      trigger={
        iconOnly ? (
          <span aria-hidden="true">{meta.icon}</span>
        ) : (
          <>
            {labelled && <span className="text-[11px] font-medium uppercase tracking-wide opacity-60">Who's going</span>}
            <span aria-hidden="true">{meta.icon}</span>
            <span className="font-semibold">{meta.label}</span>
            {CARET}
          </>
        )
      }
    >
      {(close) => (
        <ul className="py-1">
          {BUDGET_BASIS_ORDER.map((b) => {
            const m = BUDGET_BASIS_META[b];
            return (
              <li key={b}>
                <button
                  role="menuitemradio"
                  aria-checked={b === basis}
                  onClick={() => { setBasis(b); close(); }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors focus-ring-emerald ${
                    b === basis ? "bg-emerald-50 font-semibold text-emerald-800" : "text-ink-body hover:bg-surface-1"
                  }`}
                >
                  <span className="w-3 text-emerald-600" aria-hidden="true">{b === basis ? "✓" : ""}</span>
                  <span aria-hidden="true">{m.icon}</span>
                  {m.label}
                  <span className="ml-auto text-[11px] font-normal text-ink-4">{m.long}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PlanMenu>
  );
}
