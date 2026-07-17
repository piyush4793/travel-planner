import { useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { getCountryFlag } from "@/utils/countryFlags";
import { extractPlanCities } from "@/core/utils/tripPlans";
import ModalShell from "@/components/shared/ModalShell";
import { SheetCloseButton } from "../ui/sheetChrome";
import DayLengthControl from "../controls/DayLengthControl";
import FocusChips from "../controls/FocusChips";
import CityPicker from "../controls/CityPicker";
import type { ReviewSegment } from "./TripReviewCanvas";

type Tab = "shape" | "details";

type Props = {
  segment: ReviewSegment;
  onClose: () => void;
  /** Scope-aware flag resolver (domestic stops read the home-country flag). */
  flagFor?: (name: string) => string;
};

const TAB_BASE =
  "focus-ring-emerald flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-800">{children}</p>;
}

function MonthPills({ months, tone }: { months: string[]; tone: "good" | "avoid" }) {
  const cls =
    tone === "good"
      ? "border-brand-200 bg-brand-50 text-brand-800"
      : "border-accent-200 bg-accent-50 text-accent-800";
  return (
    <div className="flex flex-wrap gap-1.5">
      {months.map((m) => (
        <span key={m} className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${cls}`}>{m}</span>
      ))}
    </div>
  );
}

/**
 * Per-stop "Adjust" drawer for the Route Canvas — replaces the old cramped inline
 * expansion with a focused, tabbed overlay so a traveller can re-shape one country
 * without the segment card growing unboundedly. **Shape** hosts the same live
 * levers the single-country rail uses (Focus experiences · Cities · Trip length);
 * **Details** is a read-only per-stop reference (best/avoid windows, watch-outs,
 * stopover tip, pairs-with) so the decision context sits beside the controls.
 * Renders as a bottom-sheet on mobile and a centered modal on tablet/desktop via
 * {@link ModalShell} (focus-trap, Escape, scroll-lock, focus return, device Back).
 */
export default function SegmentAdjustDrawer({ segment, onClose, flagFor = getCountryFlag }: Props) {
  const isMobile = useBreakpoint() === "mobile";
  const [tab, setTab] = useState<Tab>("shape");
  const planCities = extractPlanCities(segment.plan.days);
  const c = segment.country;
  const hasDetails =
    !!c && ((c.bestMonths?.length ?? 0) > 0 || (c.worstMonths?.length ?? 0) > 0 || (c.avoid?.length ?? 0) > 0 || !!c.stopoverNote || (c.combo?.length ?? 0) > 0);

  return (
    <ModalShell
      open
      onClose={onClose}
      label={`Adjust ${segment.name}`}
      className={
        isMobile
          ? "relative flex h-[80vh] w-full flex-col self-end overflow-hidden rounded-t-3xl bg-surface-1 shadow-2xl focus:outline-none motion-safe:animate-[slideUp_0.25s_ease-out]"
          : "relative flex h-[560px] max-h-[85vh] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-surface-1 shadow-2xl focus:outline-none motion-safe:animate-[scaleIn_0.18s_ease-out]"
      }
    >
      <SheetCloseButton onClick={onClose} label={`Close adjust ${segment.name}`} className="absolute right-4 top-4 z-10" />

      {/* Premium header band — an emerald-tinted, full-bleed header (flag tile +
          name + nights pill + on-band tabs) so the modal reads as a branded
          "adjust this stop" surface instead of plain text floating on white. */}
      <div className="shrink-0 border-b border-brand-100 bg-gradient-to-b from-brand-50 to-white px-5 pb-3 pt-3 sm:px-6 sm:pt-5">
        {isMobile && <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-brand-300/70" />}

        <div className="flex items-center gap-2.5 pr-10">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-1 text-xl leading-none shadow-sm ring-1 ring-brand-100">{flagFor(segment.name)}</span>
          <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-brand-950">{segment.name}</h2>
          <span className="shrink-0 rounded-full border border-brand-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
            {segment.plan.days.length}{segment.plan.days.length === 1 ? " day" : " days"}
          </span>
        </div>

        {hasDetails && (
          <div role="tablist" aria-label="Adjust sections" className="mt-3.5 flex gap-1 rounded-xl bg-brand-100/60 p-1">
            <button
              type="button"
              role="tab"
              id="adjust-tab-shape"
              aria-selected={tab === "shape"}
              aria-controls="adjust-panel-shape"
              onClick={() => setTab("shape")}
              className={`${TAB_BASE} ${tab === "shape" ? "bg-surface-1 text-brand-900 shadow-sm" : "text-brand-700/70 hover:text-brand-900"}`}
            >
              <span aria-hidden="true">✦ </span>Shape
            </button>
            <button
              type="button"
              role="tab"
              id="adjust-tab-details"
              aria-selected={tab === "details"}
              aria-controls="adjust-panel-details"
              onClick={() => setTab("details")}
              className={`${TAB_BASE} ${tab === "details" ? "bg-surface-1 text-brand-900 shadow-sm" : "text-brand-700/70 hover:text-brand-900"}`}
            >
              <span aria-hidden="true">ⓘ </span>Details
            </button>
          </div>
        )}
      </div>

      {/* Fixed-height panel body: the scroll lives here so switching Shape ↔ Details
          never resizes the drawer (the old auto-height panel jumped between tabs). */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
      {(!hasDetails || tab === "shape") && (
        <div id="adjust-panel-shape" role="tabpanel" aria-labelledby="adjust-tab-shape" className="divide-y divide-line">
          {segment.experienceOptions.length > 0 && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>Focus experiences</SectionLabel>
              <FocusChips
                options={segment.experienceOptions}
                selected={segment.selectedExperiences}
                onToggle={segment.toggleExperience}
                onClear={segment.clearExperiences}
              />
            </div>
          )}
          {segment.orderedCities.length > 0 && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>Cities to visit</SectionLabel>
              <CityPicker
                cities={segment.orderedCities}
                selectedCities={segment.selectedCities}
                autoSelectedCities={segment.autoSelectedCities}
                activeExperiences={segment.selectedExperiences}
                onToggle={segment.toggleCity}
                onClear={segment.clearCities}
              />
            </div>
          )}
          <div className="py-4 first:pt-0 last:pb-0">
            <SectionLabel>Trip length</SectionLabel>
            <DayLengthControl
              days={segment.plan.days.length || segment.customDays}
              maxDays={segment.maxDays}
              recommendedDays={segment.recommendedDays}
              daysPinned={segment.daysPinned}
              handPickedCities={segment.selectedCities}
              currentCities={planCities}
              moreCitiesAvailable={segment.orderedCities.length > planCities.length}
              projectCities={segment.projectCities}
              onCommit={segment.setDays}
              onReset={segment.resetDays}
            />
          </div>
        </div>
      )}

      {hasDetails && tab === "details" && c && (
        <div id="adjust-panel-details" role="tabpanel" aria-labelledby="adjust-tab-details" className="divide-y divide-line text-[13px] leading-relaxed text-ink-body">
          {(c.bestMonths?.length ?? 0) > 0 && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>☀ Best time to go</SectionLabel>
              <MonthPills months={c.bestMonths} tone="good" />
            </div>
          )}
          {(c.worstMonths?.length ?? 0) > 0 && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>⚠ Months to avoid</SectionLabel>
              <MonthPills months={c.worstMonths!} tone="avoid" />
            </div>
          )}
          {(c.avoid?.length ?? 0) > 0 && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>Watch out for</SectionLabel>
              <ul className="space-y-1.5">
                {c.avoid!.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.stopoverNote && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>Stopover tip</SectionLabel>
              <p className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-brand-900">{c.stopoverNote}</p>
            </div>
          )}
          {(c.combo?.length ?? 0) > 0 && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>Pairs well with</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {c.combo!.map((x) => (
                  <span key={x} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-800">
                    <span aria-hidden="true">{flagFor(x)}</span> {x}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </ModalShell>
  );
}
