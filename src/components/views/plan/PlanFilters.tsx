import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { useBackDismiss } from "../../../hooks/useBackDismiss";
import PlanMenu from "./PlanMenu";
import ExperiencePicker from "./ExperiencePicker";

type Props = {
  /** Country the experiences are scoped to — shown in the panel heading. */
  country: string;
  /** All experience tags this country offers. */
  options: string[];
  /** Currently-focused experiences for this country. */
  selected: string[];
  onToggle: (exp: string) => void;
  onClear: () => void;
};

const CARET = (
  <svg className="h-2.5 w-2.5 shrink-0 opacity-60" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
    <path d="M0 0l5 6 5-6z" />
  </svg>
);

/**
 * Per-country "Filters" control for the Places step. Hosts the country's
 * experience focus today and is structured to grow (months, budget tier, pace…)
 * behind the same single trigger + count badge, so the control row never
 * overflows however many filter groups we add. One control, two responsive
 * presentations: an anchored popover on tablet/desktop (drops right under the
 * button, never detached) and a bottom-sheet on mobile — mirroring the sheet
 * pattern used elsewhere in the app. Experiences are per-country, so editing
 * here diverges only the active stop from the trip's Basics vibe.
 */
export default function PlanFilters({ country, options, selected, onToggle, onClear }: Props) {
  const bp = useBreakpoint();
  const count = selected.length;

  if (options.length === 0) return null;

  const triggerInner = (
    <>
      <span className="text-ink-3">Filters</span>
      {count > 0 && (
        <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{count}</span>
      )}
      {CARET}
    </>
  );

  const triggerClass = `flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors focus-ring-emerald ${
    count > 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
      : "border-line-strong bg-white text-ink-1 hover:border-line-strong"
  }`;

  const panel = (
    <div className="px-4 py-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">Experiences for {country}</p>
        {count > 0 && (
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{count}</span>
        )}
      </div>
      <ExperiencePicker
        experiences={options}
        selectedExperiences={selected}
        onToggleExperience={onToggle}
        onClearExperiences={onClear}
        visibleCap={Number.POSITIVE_INFINITY}
        dense
      />
    </div>
  );

  if (bp === "mobile") return <FilterSheet triggerClass={triggerClass} triggerInner={triggerInner} country={country}>{panel}</FilterSheet>;

  return (
    <PlanMenu ariaLabel={`Filters for ${country}`} width={340} triggerClassName={triggerClass} trigger={triggerInner}>
      {() => panel}
    </PlanMenu>
  );
}

/** Mobile bottom-sheet presentation of the Filters panel. */
function FilterSheet({
  triggerClass,
  triggerInner,
  country,
  children,
}: {
  triggerClass: string;
  triggerInner: React.ReactNode;
  country: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const close = useBackDismiss(open, () => { setOpen(false); btnRef.current?.focus(); });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filters for ${country}`}
        className={triggerClass}
      >
        {triggerInner}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={`Filters for ${country}`}>
          <button
            type="button"
            aria-label="Dismiss filters"
            onClick={() => close()}
            className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeInUp_0.15s_ease-out]"
          />
          <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-surface-2 px-2 pb-6 pt-3 shadow-2xl safe-bottom motion-safe:animate-[slideUp_0.2s_ease-out]">
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
            {children}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
