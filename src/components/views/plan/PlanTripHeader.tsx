import { memo, type ReactNode } from "react";
import type { Country } from "../../../core/types";
import type { StyleMeta } from "../../../core/utils/travelStyles";
import type { BudgetBasis } from "../../../core/utils/budget";
import { getCountryFlag } from "../../../utils/countryFlags";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import Tooltip from "../../shared/Tooltip";
import BasisMenu from "./BasisMenu";

/** One step as the header's stepper needs it — resolved labels, no coupling to
 *  the wizard's internal step keys. */
export type HeaderStep = { key: string; short: string; title: string };

/** Progressive trip stats — filled as the funnel advances (estimate → live). */
export type HeaderStats = {
  days: number;
  countries: number;
  cities: number;
  cost: string;
  costIcon: string;
  costLabel: string;
  /** Basics shows a forming estimate; Places/Review are live. */
  estimate?: boolean;
};

/** The minimal plan shape the header stats read — keeps the builder decoupled
 *  from the full {@link TripPlan} type. */
export type HeaderStatsPlan = {
  days: unknown[];
  costPerPerson: string;
};

/**
 * Builds the progressive header stats from the composed plan. Pure + exported so
 * the mapping (and its "hidden until an itinerary exists" contract) is unit
 * tested independently of the orchestrator. Returns `undefined` when nothing is
 * planned yet, so the strip never renders a lie.
 */
export function buildHeaderStats(
  plan: HeaderStatsPlan | null | undefined,
  cityCount: number,
  countries: number,
  costIcon: string,
  costLabel: string,
  estimate: boolean,
): HeaderStats | undefined {
  if (!plan) return undefined;
  return {
    days: plan.days.length,
    countries,
    cities: cityCount,
    cost: plan.costPerPerson,
    costIcon,
    costLabel,
    estimate,
  };
}

type Props = {
  /** Ordered trip selection (route stops). */
  selection: Country[];
  /** How many stops the header names before collapsing into a "+N" pill. */
  routeStopLimit: number;
  /** Travel-style badge for a single-country trip (hidden for multi). */
  styleMeta: StyleMeta | null;
  /** Save-trip control (slotted so the header stays layout-only). */
  saveSlot?: ReactNode;
  steps: HeaderStep[];
  activeStep: number;
  onGoToStep: (index: number) => void;
  /** Widen to match the Review breakout; narrow for Basics/Places. */
  wide: boolean;
  /** Overrides the default identity (e.g. the Places country switcher). */
  identitySlot?: ReactNode;
  /** Progressive stats strip — hidden when absent (e.g. nothing planned yet). */
  stats?: HeaderStats;
  /** The single "who's going" control — shown whenever a setter is supplied. */
  basis?: BudgetBasis;
  onBasisChange?: (b: BudgetBasis) => void;
};

/**
 * The persistent Plan-journey header: identity + a progressively-filling stats
 * strip + one "who's going" basis control + the labeled, tappable stepper that
 * doubles as back-navigation. Shared across every wizard step so identity, stats
 * and basis read identically whether the traveller is on Basics, Places, or
 * Review — the one place trip identity + progress live (DRY: no per-step stats
 * card or summary heading). Molds to its data: a single stop shows its name +
 * style badge; a route shows the ordered flags with a "+N" overflow pill; the
 * Places step swaps in a country switcher via {@link Props.identitySlot}.
 */
function PlanTripHeaderInner({
  selection,
  routeStopLimit,
  styleMeta,
  saveSlot,
  steps,
  activeStep,
  onGoToStep,
  wide,
  identitySlot,
  stats,
  basis,
  onBasisChange,
}: Props) {
  const isMulti = selection.length > 1;
  const compact = useBreakpoint() === "mobile";
  const routeLabel = selection.map((c) => `${getCountryFlag(c.name)} ${c.name}`).join("  →  ");
  const primary = selection[0];

  return (
    <div className={`mx-auto w-full shrink-0 px-4 pt-3 sm:pt-4 ${wide ? "max-w-[1400px]" : "max-w-2xl"}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {identitySlot ? (
              identitySlot
            ) : isMulti ? (
              <h1
                aria-label={`Planning a route through ${selection.map((c) => c.name).join(", ")}`}
                className="flex min-w-0 items-center font-display text-lg font-semibold tracking-tight text-ink-1 sm:text-xl"
              >
                <span className="min-w-0 truncate">
                  {selection.slice(0, routeStopLimit).map((c, i) => (
                    <span key={c.name}>
                      {i > 0 && <span aria-hidden="true" className="mx-1 text-line-strong">→</span>}
                      <span aria-hidden="true" className="mr-1">{getCountryFlag(c.name)}</span>
                      {c.name}
                    </span>
                  ))}
                </span>
                {selection.length > routeStopLimit && (
                  <Tooltip variant="wrap" text={routeLabel} triggerClassName="ml-1.5 shrink-0">
                    <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[11px] font-bold text-ink-2">
                      +{selection.length - routeStopLimit}
                    </span>
                  </Tooltip>
                )}
              </h1>
            ) : (
              <>
                <h1 className="truncate font-display text-lg font-semibold tracking-tight text-ink-1 sm:text-xl">{primary?.name}</h1>
                {styleMeta && (
                  <span
                    title={styleMeta.description}
                    className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${styleMeta.badge}`}
                  >
                    <span aria-hidden="true">{styleMeta.icon}</span> {styleMeta.label}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {(saveSlot || (basis && onBasisChange)) && (
          <div className="flex shrink-0 items-center gap-2">
            {saveSlot}
            {basis && onBasisChange && <BasisMenu basis={basis} setBasis={onBasisChange} variant="light" />}
          </div>
        )}
      </div>

      {stats && (
        compact ? (
          /* Mobile: one condensed line so the header never wraps to a second row
             of pills — days · places · countries as text, budget kept as the single
             emphasized pill pinned right. Same data as the desktop pills
             (buildHeaderStats); only the presentation branches on width. */
          <div className="mt-2.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
              <span className="font-bold text-ink-1">{stats.days}</span>&nbsp;{stats.days === 1 ? "day" : "days"}
              <span className="mx-1 text-ink-4">·</span>
              <span className="font-bold text-ink-1">{stats.cities}</span>&nbsp;{stats.cities === 1 ? "place" : "places"}
              {isMulti && (
                <>
                  <span className="mx-1 text-ink-4">·</span>
                  <span className="font-bold text-ink-1">{stats.countries}</span>&nbsp;countries
                </>
              )}
            </span>
            <span className="ml-auto inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800">
              {stats.estimate && <span className="mr-0.5 font-medium text-emerald-700/70">~</span>}
              {stats.cost}
            </span>
          </div>
        ) : (
          /* Tablet/desktop: scannable pill row (space to fill a wide header). */
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-2">
              <span className="font-bold text-ink-1">{stats.days}</span>&nbsp;{stats.days === 1 ? "day" : "days"}
            </span>
            {isMulti && (
              <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-2">
                <span className="font-bold text-ink-1">{stats.countries}</span>&nbsp;countries
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-2">
              <span className="font-bold text-ink-1">{stats.cities}</span>&nbsp;{stats.cities === 1 ? "place" : "places"}
            </span>
            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              {stats.estimate && <span className="mr-0.5 font-medium text-emerald-700/70">~</span>}
              {stats.cost}
              <span className="ml-1" title={stats.costLabel} aria-label={stats.costLabel}>{stats.costIcon}</span>
            </span>
          </div>
        )
      )}

      {/* Labeled, tappable stepper — doubles as back navigation (tap an
          earlier step to revisit it). Device/gesture Back walks steps too. */}
      <div className="mt-3 flex items-stretch gap-1.5" role="tablist" aria-label="Planning steps">
        {steps.map((s, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={active}
              aria-label={`Step ${i + 1}: ${s.title}`}
              onClick={() => onGoToStep(i)}
              className="focus-ring-emerald group flex flex-1 flex-col gap-1 rounded-lg py-1"
            >
              <span
                className={`block h-1.5 rounded-full transition-colors ${
                  active ? "bg-emerald-700" : done ? "bg-emerald-500" : "bg-line group-hover:bg-line-strong"
                }`}
              />
              <span
                className={`text-left text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
                  active ? "text-emerald-700" : done ? "text-emerald-600 group-hover:text-emerald-700" : "text-ink-4"
                }`}
              >
                {s.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PlanTripHeader = memo(PlanTripHeaderInner);
export default PlanTripHeader;
