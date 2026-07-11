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
  "focus-ring-emerald flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8a8577]">{children}</p>;
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
          ? "relative flex h-[80vh] w-full flex-col self-end overflow-hidden rounded-t-2xl bg-white px-5 pb-6 pt-3 shadow-2xl focus:outline-none motion-safe:animate-[slideUp_0.25s_ease-out]"
          : "relative flex h-[560px] max-h-[85vh] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl focus:outline-none motion-safe:animate-[scaleIn_0.18s_ease-out]"
      }
    >
      {isMobile && <span aria-hidden="true" className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-[#d9d3c4]" />}

      <button
        type="button"
        onClick={onClose}
        aria-label={`Close adjust ${segment.name}`}
        className="focus-ring-emerald absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#f2efe6] text-[#6f6a5d] transition-colors hover:bg-[#e7e2d5]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="flex shrink-0 items-center gap-2 pr-10">
        <span aria-hidden="true" className="text-xl leading-none">{getCountryFlag(segment.name)}</span>
        <h2 className="min-w-0 truncate font-display text-lg font-bold text-[#16241d]">{segment.name}</h2>
        <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          {segment.customDays}{segment.customDays === 1 ? " night" : " nights"}
        </span>
      </div>

      {hasDetails && (
        <div role="tablist" aria-label="Adjust sections" className="mt-4 flex shrink-0 gap-1 rounded-xl bg-[#f2efe6] p-1">
          <button
            type="button"
            role="tab"
            id="adjust-tab-shape"
            aria-selected={tab === "shape"}
            aria-controls="adjust-panel-shape"
            onClick={() => setTab("shape")}
            className={`${TAB_BASE} ${tab === "shape" ? "bg-white text-[#16241d] shadow-sm" : "text-[#6f6a5d] hover:text-[#16241d]"}`}
          >
            Shape
          </button>
          <button
            type="button"
            role="tab"
            id="adjust-tab-details"
            aria-selected={tab === "details"}
            aria-controls="adjust-panel-details"
            onClick={() => setTab("details")}
            className={`${TAB_BASE} ${tab === "details" ? "bg-white text-[#16241d] shadow-sm" : "text-[#6f6a5d] hover:text-[#16241d]"}`}
          >
            Details
          </button>
        </div>
      )}

      {/* Fixed-height panel body: the scroll lives here so switching Shape ↔ Details
          never resizes the drawer (the old auto-height panel jumped between tabs). */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
      {(!hasDetails || tab === "shape") && (
        <div id="adjust-panel-shape" role="tabpanel" aria-labelledby="adjust-tab-shape" className="space-y-4">
          {segment.experienceOptions.length > 0 && (
            <div>
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
            <div>
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
          <div>
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
        <div id="adjust-panel-details" role="tabpanel" aria-labelledby="adjust-tab-details" className="space-y-4 text-[13px] leading-relaxed text-[#4a463d]">
          {(c.bestMonths?.length ?? 0) > 0 && (
            <div>
              <SectionLabel>☀ Best time to go</SectionLabel>
              <p>{c.bestMonths.join(" · ")}</p>
            </div>
          )}
          {(c.worstMonths?.length ?? 0) > 0 && (
            <div>
              <SectionLabel>⚠ Months to avoid</SectionLabel>
              <p className="text-amber-700">{c.worstMonths!.join(" · ")}</p>
            </div>
          )}
          {(c.avoid?.length ?? 0) > 0 && (
            <div>
              <SectionLabel>Watch out for</SectionLabel>
              <ul className="list-disc space-y-1 pl-4">
                {c.avoid!.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          )}
          {c.stopoverNote && (
            <div>
              <SectionLabel>Stopover tip</SectionLabel>
              <p>{c.stopoverNote}</p>
            </div>
          )}
          {(c.combo?.length ?? 0) > 0 && (
            <div>
              <SectionLabel>Pairs well with</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {c.combo!.map((x) => (
                  <span key={x} className="inline-flex items-center gap-1 rounded-full bg-[#f2efe6] px-2.5 py-1 text-[12px] font-medium text-[#4a463d]">
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
