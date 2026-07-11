import { useState } from "react";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { getCountryFlag } from "../../../utils/countryFlags";
import { extractPlanCities } from "../../../core/utils/tripPlans";
import ModalShell from "../../shared/ModalShell";
import DayLengthControl from "./DayLengthControl";
import FocusChips from "./FocusChips";
import CityPicker from "./CityPicker";
import type { ReviewSegment } from "./TripReviewCanvas";

type Tab = "shape" | "details";

type Props = {
  segment: ReviewSegment;
  onClose: () => void;
};

const TAB_BASE =
  "focus-ring-emerald flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-800">{children}</p>;
}

function MonthPills({ months, tone }: { months: string[]; tone: "good" | "avoid" }) {
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
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
export default function SegmentAdjustDrawer({ segment, onClose }: Props) {
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
          ? "relative flex h-[80vh] w-full flex-col self-end overflow-hidden rounded-t-2xl bg-white shadow-2xl focus:outline-none motion-safe:animate-[slideUp_0.25s_ease-out]"
          : "relative flex h-[560px] max-h-[85vh] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none motion-safe:animate-[scaleIn_0.18s_ease-out]"
      }
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close adjust ${segment.name}`}
        className="focus-ring-emerald absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-emerald-800 ring-1 ring-emerald-100 transition-colors hover:bg-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* Premium header band — an emerald-tinted, full-bleed header (flag tile +
          name + nights pill + on-band tabs) so the modal reads as a branded
          "adjust this stop" surface instead of plain text floating on white. */}
      <div className="shrink-0 border-b border-emerald-100 bg-gradient-to-b from-emerald-50/90 to-white px-5 pb-3 pt-3 sm:px-6 sm:pt-5">
        {isMobile && <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-9 rounded-full bg-line-strong" />}

        <div className="flex items-center gap-2.5 pr-10">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xl leading-none shadow-sm ring-1 ring-emerald-100">{getCountryFlag(segment.name)}</span>
          <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-emerald-950">{segment.name}</h2>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            {segment.customDays}{segment.customDays === 1 ? " night" : " nights"}
          </span>
        </div>

        {hasDetails && (
          <div role="tablist" aria-label="Adjust sections" className="mt-3.5 flex gap-1 rounded-xl bg-emerald-100/60 p-1">
            <button
              type="button"
              role="tab"
              id="adjust-tab-shape"
              aria-selected={tab === "shape"}
              aria-controls="adjust-panel-shape"
              onClick={() => setTab("shape")}
              className={`${TAB_BASE} ${tab === "shape" ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-700/70 hover:text-emerald-900"}`}
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
              className={`${TAB_BASE} ${tab === "details" ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-700/70 hover:text-emerald-900"}`}
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
              days={segment.customDays}
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
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.stopoverNote && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>Stopover tip</SectionLabel>
              <p className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-emerald-900">{c.stopoverNote}</p>
            </div>
          )}
          {(c.combo?.length ?? 0) > 0 && (
            <div className="py-4 first:pt-0 last:pb-0">
              <SectionLabel>Pairs well with</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {c.combo!.map((x) => (
                  <span key={x} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-800">
                    <span aria-hidden="true">{getCountryFlag(x)}</span> {x}
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
