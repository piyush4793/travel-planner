import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Country } from "@/core/types";
import type { CityEntry } from "@/core/types";
import type { CountryRule } from "@/core/data/itineraryRules";
import type { TripPlan } from "@/core/utils/tripPlans";
import { extractPlanCities, shiftPlanDays, planCostBasisIcon, planCostBasisLabel } from "@/core/utils/tripPlans";
import { getCountryFlag } from "@/utils/countryFlags";
import ItineraryView, { groupDays } from "@/components/country/itinerary/ItineraryView";
import PlanCityJumpNav, { type JumpSection } from "../controls/PlanCityJumpNav";
import RouteLeversBar, { type LeverStop } from "./RouteLeversBar";
import SegmentAdjustDrawer from "./SegmentAdjustDrawer";
import BorderHop from "./BorderHop";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { GeoPoint } from "@/core/utils/routeOrder";

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
  /** Which stop is the anchor (importance ★) — expanded by default. */
  anchorName: string;
  onSetAnchor: (name: string) => void;
  /** Move the stop from one visit-order index to another (drag / keyboard reorder). */
  onReorder: (from: number, to: number) => void;
  /** Re-sort the route into a sensible nearest-neighbour chain from the anchor. */
  onAutoArrange: () => void;
  canAutoArrange: boolean;
  /**
   * The composed itinerary's action toolbar (Share/Cinematic/PDF/AI), built by the
   * workspace so it can also live in the mobile/tablet Actions sheet. The canvas
   * only pins it at the card foot on desktop; below `lg` the shell renders it.
   */
  toolbar: ReactNode;
  /** Scope-aware flag resolver (domestic stops read the home-country flag). */
  flagFor?: (name: string) => string;
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
  flagFor: (name: string) => string;
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
  flagFor,
}: SegmentBlockProps) {
  const [adjusting, setAdjusting] = useState(false);
  const planCities = extractPlanCities(segment.plan.days);
  const placeCount = planCities.length;
  const prevCities = prevSegment ? extractPlanCities(prevSegment.plan.days) : [];
  const hopFromCity = prevCities[prevCities.length - 1];
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
          fromCity={hopFromCity}
          toCity={planCities[0]}
          fromPoint={prevSegment.point}
          toPoint={segment.point}
        />
      )}

      {/* Stop header — a branded "country section" title bar: soft emerald tint +
          a numbered stop badge + prominent name, distinct from the white itinerary
          body below (a titled-card look) so each country reads as its own section,
          yet stays light (not a heavy dark band) so the itinerary still leads on
          mobile. Reorder + anchor live in the levers bar. */}
      <div className={`relative mx-3 rounded-t-2xl border border-b-0 bg-brand-50/70 px-3 py-2.5 text-ink-1 ${isAnchor && total > 1 ? "border-brand-200/70 border-l-transparent" : "border-brand-200/70"}`}>
        {/* Full-bleed toggle behind the header content, so the whole band (name,
            stats, and the empty gap) collapses/expands the itinerary — not just a
            tiny chevron. The identity content is inert to pointer events; the
            interactive controls float above with pointer-events re-enabled. */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={collapsed ? `Expand ${segment.name} itinerary` : `Collapse ${segment.name} itinerary`}
          className="focus-ring-emerald absolute inset-0 rounded-t-2xl transition-colors hover:bg-brand-100/50"
        />
        {/* Anchor cue = a slim amber left accent bar (Option B). It marks the trip's
            longest stop without a pill/word competing with the country name. Purely
            decorative: absolutely positioned so it never shifts the content grid,
            rounded only at the top-left to follow the band, and above the toggle so
            it stays crisp on hover. The status is conveyed to assistive tech via the
            sr-only label on the name row below. */}
        {isAnchor && total > 1 && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-tl-2xl bg-accent-500" />
        )}
        <div className="pointer-events-none relative">
          {/* Two-gutter grid: a fixed left gutter carries the row icon (flag / pin),
              so the name, stats, and city strip all share one content column; a
              matching right gutter carries the collapse chevron, so the ✏️ action,
              budget, and "Expand" share one right edge. Row 1 is pure identity +
              the single ✏️ action so the country name leads (anchor status is the
              amber left accent bar, not a pill that outshouts the name). */}
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="w-5 shrink-0 text-center text-base leading-none">{flagFor(segment.name)}</span>
            <h3 className="min-w-0 flex-1 truncate font-display text-[17px] font-bold leading-tight text-brand-900">
              {segment.name}
              {isAnchor && total > 1 && <span className="sr-only"> — anchor stop</span>}
            </h3>

            <button
              type="button"
              onClick={() => setAdjusting(true)}
              aria-haspopup="dialog"
              aria-label={`Adjust ${segment.name}`}
              className="focus-ring-emerald pointer-events-auto flex min-h-[32px] shrink-0 items-center gap-1 rounded-full border border-brand-300 bg-surface-1 px-2.5 py-1 text-[11px] font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              <span aria-hidden="true">✏️</span> {segment.plan.days.length}d
            </button>

            {/* Decorative collapse indicator — the full-bleed button above owns the
                interaction and the a11y semantics, so this is hidden from the a11y
                tree (pointer clicks fall through to that button). Fixed-width gutter
                so the ✏️ action above and the budget below share a right edge. */}
            <span
              aria-hidden="true"
              className="pointer-events-none w-5 shrink-0 text-center text-[11px] leading-none text-brand-700"
            >
              {collapsed ? "▾" : "▴"}
            </span>
          </div>
          {/* Row 2 mirrors the grid: empty left gutter · stats (content column) ·
              budget + basis icon. Stats align under the name; the budget runs to
              the band's right padding edge (no trailing gutter) so it keeps clear
              of the day range on narrow / dev-tools-open viewports. */}
          <div className="mt-1 flex items-baseline gap-2 text-[11px] text-brand-800/70">
            <span aria-hidden="true" className="w-5 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span><span className="font-semibold text-brand-900">{placeCount}</span> {placeCount === 1 ? "place" : "places"}</span>
              <span aria-hidden="true" className="text-brand-600/40">·</span>
              <span>{dayRange}</span>
            </div>
            <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap text-[12px] font-bold text-brand-700" title={planCostBasisLabel(segment.plan)}>
              {cost}
              <span aria-hidden="true" className="text-[11px] font-normal text-brand-700/60">{planCostBasisIcon(segment.plan)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stop-specific planning note (e.g. length auto-expanded) — attributed to
          this country so the traveller knows exactly which stop it applies to. */}
      {segment.plan.warning && (
        <div className="mx-3 border-x border-accent-200 bg-accent-50 px-3 py-2">
          <p className="flex gap-1.5 text-[11px] leading-snug text-accent-700">
            <span aria-hidden="true" className="shrink-0">⚠️</span>
            <span>{segment.plan.warning}</span>
          </p>
        </div>
      )}

      {/* Per-stop shaping now lives in a focused drawer (Shape · Details), so the
          segment card never grows unboundedly and the controls sit beside their
          own decision context. Opened by the ✏️ Adjust trigger above. */}
      {adjusting && <SegmentAdjustDrawer segment={segment} onClose={() => setAdjusting(false)} flagFor={flagFor} />}

      {/* Rich day-by-day body — collapsible; the anchor opens by default. */}
      {collapsed ? (
        <button
          type="button"
          id={bodyId}
          onClick={onToggleCollapsed}
          className="focus-ring-emerald mx-3 mb-1 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-b-2xl border border-t-0 border-brand-200/70 bg-brand-50/40 px-3 py-2.5 text-left transition-colors hover:bg-brand-50"
        >
          <span aria-hidden="true" className="w-5 shrink-0 text-center text-[11px] leading-none text-brand-600">📍</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink-body">
            {planCities.length > 0 ? planCities.join("  ·  ") : "Tap to view the day-by-day plan"}
          </span>
          <span aria-hidden="true" className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-brand-700">Expand ▾</span>
        </button>
      ) : (
        <div id={bodyId} className="mx-3 mb-1 rounded-b-2xl border border-t-0 border-line bg-surface-2 py-3">
          <ItineraryView plan={displayPlan} rule={segment.rule} country={segment.name} />
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
 * wrap the whole thing. Shared by single- and multi-country Review: at N=1 the
 * reorder/anchor levers mold away (nothing to sequence) and the lone stop reads as
 * a plain itinerary, so a single-country trip stays byte-identical to before.
 */
function TripReviewCanvasInner({
  segments,
  anchorName,
  onSetAnchor,
  onReorder,
  onAutoArrange,
  canAutoArrange,
  toolbar,
  flagFor = getCountryFlag,
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

  // Desktop pins the action toolbar at the card foot; below `lg` the workspace
  // shell surfaces the same toolbar in an "Actions" bottom-sheet (so it is never
  // buried at the route's scroll end, and the mobile bar owns all trip actions).
  const pinToolbar = useBreakpoint() === "desktop";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface-1 shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      {/* Trip-level toolbar — route order + jump-to-city on one row, so each
          stop header stays uncluttered. The bar is pinned above the scroll area
          (Jump is always reachable). Party size + route label live in the
          persistent header (no duplicate summary band). */}
      <RouteLeversBar
        stops={leverStops}
        anchorName={anchorName}
        onSetAnchor={onSetAnchor}
        onReorder={onReorder}
        onAutoArrange={onAutoArrange}
        canAutoArrange={canAutoArrange}
        flagFor={flagFor}
      >
        <PlanCityJumpNav sections={sections} onJump={handleJump} embedded flagFor={flagFor} />
      </RouteLeversBar>

      <div className="flex-1 overflow-y-auto bg-surface-2 py-2">
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
              flagFor={flagFor}
            />
          );
        })}
      </div>

      {pinToolbar && <div className="border-t border-line">{toolbar}</div>}
    </div>
  );
}

const TripReviewCanvas = memo(TripReviewCanvasInner);
export default TripReviewCanvas;
