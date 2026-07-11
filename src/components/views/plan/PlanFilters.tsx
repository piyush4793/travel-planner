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

/** Standard "sliders" filter glyph — reads cross-platform (no emoji font drift). */
const SLIDERS = (
  <svg className="h-4 w-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="4" y1="8" x2="20" y2="8" />
    <circle cx="9" cy="8" r="2.4" fill="white" />
    <line x1="4" y1="16" x2="20" y2="16" />
    <circle cx="15" cy="16" r="2.4" fill="white" />
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

  // Branded header band — one component drives both the desktop popover and the
  // mobile sheet, so the Filters overlay matches every other Plan overlay
  // (switcher/basis/sort). The close affordance only renders on mobile, where the
  // sheet has no outside-click dismiss.
  const HeaderBand = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white px-4 py-3">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-emerald-100">{SLIDERS}</span>
      <h3 className="min-w-0 flex-1 font-display text-[15px] font-bold leading-tight text-emerald-950">Filters · {country}</h3>
      {count > 0 && (
        <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{count}</span>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="focus-ring-emerald flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100 transition-colors hover:bg-white"
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}
    </div>
  );

  // Sectioned, scalable body. Each filter category is a labelled FilterGroup, so
  // adding more groups later (best months, budget tier, pace…) is a drop-in — they
  // stack under the same overlay with dividers between them, never overflowing the
  // control row. Experiences is the first (currently only) group.
  const body = (
    <div className="divide-y divide-line">
      <FilterGroup label="Experiences" count={count} onClear={onClear}>
        <ExperiencePicker
          experiences={options}
          selectedExperiences={selected}
          onToggleExperience={onToggle}
          onClearExperiences={onClear}
          visibleCap={Number.POSITIVE_INFINITY}
          dense
          hideClear
        />
      </FilterGroup>
    </div>
  );

  // Footer owns the primary confirm. Clearing is per-group (each FilterGroup
  // header carries its own inline Clear), so a facet resets independently; a
  // global "Clear all" belongs here only once a second group exists.
  const Footer = ({ onClose }: { onClose: () => void }) => (
    <div className="shrink-0 border-t border-line bg-surface-1 px-4 py-3">
      <button
        type="button"
        onClick={onClose}
        className="focus-ring-emerald min-h-[44px] w-full rounded-xl bg-emerald-700 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-emerald-800"
      >
        Done{count > 0 ? ` · ${count} selected` : ""}
      </button>
    </div>
  );

  if (bp === "mobile")
    return (
      <FilterSheet
        triggerClass={triggerClass}
        triggerInner={triggerInner}
        country={country}
        renderHeader={(close) => <HeaderBand onClose={close} />}
        renderFooter={(close) => <Footer onClose={close} />}
      >
        {body}
      </FilterSheet>
    );

  return (
    <PlanMenu ariaLabel={`Filters for ${country}`} width={340} triggerClassName={triggerClass} trigger={triggerInner}>
      {(close) => (
        <div className="flex max-h-[70vh] flex-col overflow-hidden">
          <HeaderBand />
          <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
          <Footer onClose={close} />
        </div>
      )}
    </PlanMenu>
  );
}

/** One labelled filter category inside the Filters overlay. Stacking several of
 *  these (with the parent's `divide-y`) is how the panel scales to more filters.
 *  Each group owns its own inline Clear, so a facet resets independently — no
 *  need to touch sibling groups or fall back to a global wipe. */
function FilterGroup({
  label,
  count = 0,
  onClear,
  children,
}: {
  label: string;
  count?: number;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-3.5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">{label}</h4>
        {count > 0 && (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-emerald-800">{count}</span>
        )}
        {onClear && count > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            className="focus-ring-emerald ml-auto -my-1 inline-flex min-h-[32px] items-center rounded-full px-2.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
          >
            Clear
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/** Mobile bottom-sheet presentation of the Filters panel. */
function FilterSheet({
  triggerClass,
  triggerInner,
  country,
  renderHeader,
  renderFooter,
  children,
}: {
  triggerClass: string;
  triggerInner: React.ReactNode;
  country: string;
  renderHeader: (close: () => void) => React.ReactNode;
  renderFooter: (close: () => void) => React.ReactNode;
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
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={`Filters for ${country}`}>
          <button
            type="button"
            aria-label="Dismiss filters"
            onClick={() => close()}
            className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeInUp_0.15s_ease-out]"
          />
          <div className="relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-emerald-100 bg-white shadow-2xl safe-bottom motion-safe:animate-[slideUp_0.2s_ease-out]">
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
            {renderHeader(close)}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {renderFooter(close)}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
