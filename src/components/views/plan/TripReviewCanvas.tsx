import { memo, useEffect, useMemo, useState } from "react";
import type { Country } from "../../../core/types";
import type { CityEntry } from "../../../core/types";
import type { CountryRule } from "../../../core/data/itineraryRules";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { extractPlanCities, shiftPlanDays } from "../../../core/utils/tripPlans";
import { getCountryFlag } from "../../../utils/countryFlags";
import ItineraryView, { groupDays } from "../../country/itinerary/ItineraryView";
import PlanCityJumpNav, { type JumpSection } from "./PlanCityJumpNav";
import RouteLeversBar, { type LeverStop } from "./RouteLeversBar";
import { ITINERARY_TOP_ID } from "./ItinerarySummaryBar";
import ItineraryToolbar from "./ItineraryToolbar";
import SegmentAdjustDrawer from "./SegmentAdjustDrawer";
import BorderHop from "./BorderHop";
import type { GeoPoint } from "../../../core/utils/routeOrder";

/**
 * One stop on a composed multi-country route, normalised so the Route Canvas is
 * agnostic to whether the stop came from the primary funnel ({@link usePlanBuilder})
 * or an additional-stop planner ({@link useTripPlanner}). It carries the stop's
 * own itinerary + rule (so the rich day renderer keeps its transport/route/link
 * richness) plus the shaping levers the canvas tunes in place: focus experiences,
 * the city picker, and length.
 */
export interface ReviewSegment {
  name: string;
  rule: CountryRule | null;
  plan: TripPlan;
  /** Full country data for this stop (Details tab reference in the Adjust drawer). */
  country?: Country;
  customDays: number;
  recommendedDays: number;
  maxDays: number;
  daysPinned: boolean;
  /** Cities the traveller hand-picked for this stop (empty = auto plan). */
  selectedCities: string[];
  /** Cities the auto plan visits — pre-checked when nothing is hand-picked. */
  autoSelectedCities: string[];
  /** This stop's cities in vibe-first order (for the inline picker). */
  orderedCities: CityEntry[];
  /** Experience tags this stop can deliver (inline Focus options). */
  experienceOptions: string[];
  /** This stop's currently focused experiences (effective). */
  selectedExperiences: string[];
  projectCities: (days: number) => string[];
  setDays: (days: number) => void;
  resetDays: () => void;
  toggleCity: (city: string) => void;
  clearCities: () => void;
  toggleExperience: (exp: string) => void;
  clearExperiences: () => void;
  point?: GeoPoint;
}

type Props = {
  /** The stops in visit order (already reordered by the workspace). */
  segments: ReviewSegment[];
  /** The whole route folded into one plan (in visit order). */
  composedPlan: TripPlan;
  /** Primary destination the share/PDF name after. */
  country: Country;
  homeCountry: string;
  onPlanWithAi?: () => void;
  /** Which stop is the anchor (importance ★) — expanded by default. */
  anchorName: string;
  onSetAnchor: (name: string) => void;
  /** Move the stop from one visit-order index to another (drag / keyboard reorder). */
  onReorder: (from: number, to: number) => void;
  /** Re-sort the route into a sensible nearest-neighbour chain from the anchor. */
  onAutoArrange: () => void;
  canAutoArrange: boolean;
};

type SegmentBlockProps = {
  segment: ReviewSegment;
  /** The preceding stop (for the border hop into this one); undefined for the first. */
  prevSegment?: ReviewSegment;
  position: number;
  total: number;
  dayStart: number;
  dayEnd: number;
  isAnchor: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function SegmentBlock({
  segment,
  prevSegment,
  position,
  total,
  dayStart,
  dayEnd,
  isAnchor,
  collapsed,
  onToggleCollapsed,
}: SegmentBlockProps) {
  const [adjusting, setAdjusting] = useState(false);
  const planCities = extractPlanCities(segment.plan.days);
  const placeCount = planCities.length;
  const cost = segment.plan.costPerPerson;
  const bodyId = `segment-body-${segment.name.replace(/\s+/g, "-")}`;
  const dayRange = dayStart === dayEnd ? `Day ${dayStart}` : `Days ${dayStart}–${dayEnd}`;

  // The day cards renumber to the route timeline (Day 1..N across all stops) so
  // the cards match this stop's cumulative "Days 12–15" header instead of each
  // country restarting at Day 1. The first stop (offset 0) is unchanged.
  const displayPlan = useMemo<TripPlan>(
    () => ({ ...segment.plan, days: shiftPlanDays(segment.plan.days, dayStart - 1) }),
    [segment.plan, dayStart],
  );

  return (
    <section aria-label={`${segment.name} — stop ${position + 1} of ${total}`} className="scroll-mt-2">
      {/* Border hop between countries — honest, expandable to an informational mode picker. */}
      {position > 0 && prevSegment && (
        <BorderHop
          fromName={prevSegment.name}
          toName={segment.name}
          fromPoint={prevSegment.point}
          toPoint={segment.point}
        />
      )}

      {/* Stop header: identity + anchor badge · stats + range · adjust · collapse.
          Reorder + anchor selection live in the trip-level levers bar. */}
      <div className="mx-3 rounded-t-2xl border border-b-0 border-[#e4dece] bg-gradient-to-r from-[#123a2b] to-[#0f2f23] px-3 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg leading-none">{getCountryFlag(segment.name)}</span>
          <h3 className="min-w-0 flex-1 truncate font-display text-base font-semibold">{segment.name}</h3>

          {isAnchor && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-300/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3a2c05]">
              <span aria-hidden="true">★</span> Anchor
            </span>
          )}

          <button
            type="button"
            onClick={() => setAdjusting(true)}
            aria-haspopup="dialog"
            aria-label={`Adjust ${segment.name}`}
            className="focus-ring-emerald flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
          >
            <span aria-hidden="true">✏️</span> {segment.customDays}d
          </button>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={collapsed ? `Expand ${segment.name} itinerary` : `Collapse ${segment.name} itinerary`}
            className="focus-ring-emerald flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <span aria-hidden="true" className="text-[11px] leading-none">{collapsed ? "▾" : "▴"}</span>
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px] text-white/80">
          <span><span className="font-semibold text-white">{segment.customDays}</span> {segment.customDays === 1 ? "night" : "nights"}</span>
          <span aria-hidden="true" className="text-white/30">·</span>
          <span><span className="font-semibold text-white">{placeCount}</span> {placeCount === 1 ? "place" : "places"}</span>
          <span aria-hidden="true" className="text-white/30">·</span>
          <span className="text-white/70">{dayRange}</span>
          <span className="ml-auto whitespace-nowrap font-bold text-emerald-300">{cost}</span>
        </div>
      </div>

      {/* Stop-specific planning note (e.g. length auto-expanded) — attributed to
          this country so the traveller knows exactly which stop it applies to. */}
      {segment.plan.warning && (
        <div className="mx-3 border-x border-amber-200 bg-amber-50 px-3 py-2">
          <p className="flex gap-1.5 text-[11px] leading-snug text-amber-700">
            <span aria-hidden="true" className="shrink-0">⚠️</span>
            <span>{segment.plan.warning}</span>
          </p>
        </div>
      )}

      {/* Per-stop shaping now lives in a focused drawer (Shape · Details), so the
          segment card never grows unboundedly and the controls sit beside their
          own decision context. Opened by the ✏️ Adjust trigger above. */}
      {adjusting && <SegmentAdjustDrawer segment={segment} onClose={() => setAdjusting(false)} />}

      {/* Rich day-by-day body — collapsible; the anchor opens by default. */}
      {collapsed ? (
        <button
          type="button"
          id={bodyId}
          onClick={onToggleCollapsed}
          className="focus-ring-emerald mx-3 mb-1 flex w-[calc(100%-1.5rem)] items-center justify-between gap-2 rounded-b-2xl border border-t-0 border-[#e4dece] bg-white px-4 py-2.5 text-left transition-colors hover:bg-[#faf8f1]"
        >
          <span className="min-w-0 truncate text-[11px] text-[#6f6a5d]">
            {planCities.length > 0 ? planCities.join(" · ") : "Tap to view the day-by-day plan"}
          </span>
          <span aria-hidden="true" className="shrink-0 text-[11px] font-semibold text-emerald-700">Expand ▾</span>
        </button>
      ) : (
        <div id={bodyId} className="mx-3 mb-1 rounded-b-2xl border border-t-0 border-[#e4dece] bg-white py-3">
          <ItineraryView plan={displayPlan} rule={segment.rule} variant="luxury" />
        </div>
      )}
    </section>
  );
}

/**
 * The multi-country "Route Canvas": one composed, segmented itinerary. Every
 * stop keeps its own rich day cards (route links, search/maps links, eat/hotel
 * pills, transport separators) via the shared ItineraryView; honest border-hop
 * rows mark the transitions between countries; each stop's length is tunable in
 * place, its position reorderable (accessible up/down, plus one-tap auto-arrange),
 * and its body collapsible (the anchor opens by default while the rest fold into a
 * scannable overview). A composed summary + cross-route jump nav + shared toolbar
 * wrap the whole thing. N=1 never reaches here — the single-country preview owns
 * that — so this is the multi-country surface only.
 */
function TripReviewCanvasInner({
  segments,
  composedPlan,
  country,
  homeCountry,
  onPlanWithAi,
  anchorName,
  onSetAnchor,
  onReorder,
  onAutoArrange,
  canAutoArrange,
}: Props) {
  // Anchor opens by default; the rest fold. An explicit toggle overrides per stop,
  // reset whenever the route identity or the anchor changes.
  const routeKey = segments.map((s) => s.name).join("→");
  const [override, setOverride] = useState<Record<string, boolean>>({});
  useEffect(() => { setOverride({}); }, [routeKey, anchorName]);
  const isCollapsed = (name: string) => override[name] ?? name !== anchorName;
  const toggle = (name: string) => setOverride((o) => ({ ...o, [name]: !isCollapsed(name) }));

  // One jump nav across every stop, grouped by country in visit order. Each
  // section keeps its own cities so the dropdown reads country → city.
  const sections: JumpSection[] = segments.map((s) => ({
    country: s.name,
    cities: groupDays(s.plan.days, s.rule),
  }));

  // Stops fed to the trip-level levers bar (route order + anchor).
  const leverStops: LeverStop[] = segments.map((s) => ({ name: s.name }));

  // Jumping to a city inside a collapsed stop must first expand that stop —
  // otherwise its day nodes aren't rendered and the scroll target doesn't exist.
  const [pendingCity, setPendingCity] = useState<string | null>(null);
  const handleJump = (cityName: string) => {
    const owner = sections.find((sec) => sec.cities.some((c) => c.name === cityName));
    if (owner && isCollapsed(owner.country)) {
      setOverride((o) => ({ ...o, [owner.country]: false }));
      setPendingCity(cityName);
      return;
    }
    document.getElementById(`city-${cityName}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {
    if (!pendingCity) return;
    const raf = requestAnimationFrame(() => {
      document.getElementById(`city-${pendingCity}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingCity(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingCity, override]);

  // Cumulative day ranges follow visit order (banners are route-relative).
  let dayCursor = 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4dece] bg-white shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      {/* Trip-level toolbar — route order + jump-to-city + back-to-top on one
          row, so each stop header stays uncluttered. Party size + route label
          live in the persistent header (no duplicate summary band). */}
      <RouteLeversBar
        stops={leverStops}
        anchorName={anchorName}
        onSetAnchor={onSetAnchor}
        onReorder={onReorder}
        onAutoArrange={onAutoArrange}
        canAutoArrange={canAutoArrange}
        topAnchorId={ITINERARY_TOP_ID}
      >
        <PlanCityJumpNav sections={sections} onJump={handleJump} embedded />
      </RouteLeversBar>

      <div className="flex-1 overflow-y-auto bg-[#f7f4ec] py-2">
        <span id={ITINERARY_TOP_ID} aria-hidden="true" />
        {segments.map((segment, i) => {
          const start = dayCursor + 1;
          const end = dayCursor + segment.plan.days.length;
          dayCursor = end;
          return (
            <SegmentBlock
              key={segment.name}
              segment={segment}
              prevSegment={segments[i - 1]}
              position={i}
              total={segments.length}
              dayStart={start}
              dayEnd={end}
              isAnchor={segment.name === anchorName}
              collapsed={isCollapsed(segment.name)}
              onToggleCollapsed={() => toggle(segment.name)}
            />
          );
        })}
      </div>

      <ItineraryToolbar
        country={country}
        plan={composedPlan}
        homeCountry={homeCountry}
        onPlanWithAi={onPlanWithAi}
      />
    </div>
  );
}

const TripReviewCanvas = memo(TripReviewCanvasInner);
export default TripReviewCanvas;
