import { memo, useEffect, useRef } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { Country } from "@/core/types";
import type { TripPlan } from "@/core/utils/tripPlans";
import { planCostBasisIcon, planCostBasisLabel } from "@/core/utils/tripPlans";
import { tripReadiness, READINESS_ICON, type ReadinessTone } from "@/core/utils/tripReadiness";
import { getCountryFlag } from "@/utils/countryFlags";
import MonthHeatmap from "@/components/country/panel/MonthHeatmap";
import { LearnAboutSection, PlanningResourcesSection, UsefulLinksSection } from "@/components/country/panel/InfoSections";
import RailSection from "./RailSection";
import PlanNotesSection from "./PlanNotesSection";

/** One stop's contribution to the budget ledger (flag · nights · its own cost). */
export type TripCostRow = { name: string; nights: number; cost: string };

type Props = {
  /** Stops in visit order (full country data for seasons/tips). */
  countries: Country[];
  composedPlan: TripPlan;
  perCountryCost: TripCostRow[];
  /** Departure country, for visa/route planning links. */
  homeCountry: string;
  /** Primary destination notes (the trip's scratchpad). */
  notes: string;
  onSaveNotes?: (notes: string) => void;
};

const READINESS_TONE_CLASS: Record<ReadinessTone, string> = {
  ok: "text-emerald-700",
  info: "text-ink-2",
  warn: "text-amber-600",
};

/**
 * Per-country "Before you go" block (learn snapshot, visa/planning links, useful
 * links). Owns its own name ref so LearnAboutSection can drop stale async results
 * when the route changes. The country subheading only renders on a multi-stop
 * route — a single-country trip already names the destination in the header, so
 * N=1 stays byte-identical to the old single-country rail.
 */
function CountryBeforeYouGo({ country, homeCountry, showHeading }: { country: Country; homeCountry: string; showHeading: boolean }) {
  const nameRef = useRef<string | null>(country.name);
  useEffect(() => { nameRef.current = country.name; }, [country.name]);
  return (
    <div className="space-y-2.5">
      {showHeading && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink-1">
          <span aria-hidden="true">{getCountryFlag(country.name)}</span>
          {country.name}
        </p>
      )}
      <LearnAboutSection countryName={country.name} currentCountryNameRef={nameRef} />
      <PlanningResourcesSection countryName={country.name} homeCountry={homeCountry} />
      <UsefulLinksSection links={country.links} />
    </div>
  );
}

/**
 * The unified "Insights" rail — trip-level reference the traveller reads
 * (never a lever), shared by single- and multi-country Review. Molds to its data:
 * trip readiness (honest visa/border fallback), an honest per-country budget
 * ledger (×nights line items + an italic inter-country caveat, never a faked leg
 * total), per-country seasonality, watch-outs & pairings, the trip notes
 * scratchpad, and a per-country "Before you go" (learn snapshot, visa/planning
 * links, useful links). The who's-going basis and headline stats live once in the
 * persistent Trip Header — the ledger only reflects the active basis, it never
 * duplicates the switch. Each section/row renders only when a country carries it,
 * so a single-country trip (N=1) stays byte-identical to the old single rail.
 */
function TripContextRailInner({ countries, composedPlan, perCountryCost, homeCountry, notes, onSaveNotes }: Props) {
  // The same rail node is rendered inline on the desktop aside (discrete cards)
  // and inside the mobile "Insights" bottom-sheet. In the sheet the parent
  // already supplies the emerald surface, so bordered cards would read as
  // cards-inside-a-card; there we switch to flat, hairline-divided sections that
  // match the Adjust/Filters sheets. Reactive to the breakpoint.
  const flat = useBreakpoint() !== "desktop";
  const v = flat ? "flat" : "card";
  const readiness = tripReadiness(countries);
  const seasonCountries = countries.filter((c) => (c.bestMonths?.length ?? 0) > 0 || (c.worstMonths?.length ?? 0) > 0);
  const tipCountries = countries.filter((c) => !!c.stopoverNote || (c.avoid?.length ?? 0) > 0 || (c.combo?.length ?? 0) > 0);
  const multi = countries.length > 1;

  return (
    <div className={flat ? "divide-y divide-line" : "space-y-2.5"}>
      <RailSection title="Trip readiness" hint="before you book" variant={v} defaultOpen>
        <ul className="space-y-1.5">
          {readiness.map((item) => (
            <li key={item.text} className="flex gap-1.5 text-[11px] leading-snug">
              <span aria-hidden="true" className={`mt-px shrink-0 font-bold ${READINESS_TONE_CLASS[item.tone]}`}>
                {READINESS_ICON[item.tone]}
              </span>
              <span className="text-ink-body">{item.text}</span>
            </li>
          ))}
        </ul>
      </RailSection>

      <RailSection
        title="Budget"
        hint={planCostBasisLabel(composedPlan)}
        variant={v}
        defaultOpen
      >
        {/* Honest budget ledger — per-country line items are real; the legs line
            is an explicit caveat (no faked total) and the subtotal notes flights
            are excluded. The who's-going basis lives in the Trip Header; this only
            reflects it. */}
        <ul className="space-y-1">
          {perCountryCost.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                <span aria-hidden="true">{getCountryFlag(row.name)}</span>
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 text-ink-4">×{row.nights}n</span>
              </span>
              <span className="shrink-0 font-semibold text-ink-1">{row.cost}</span>
            </li>
          ))}
          {countries.length > 1 && (
            <li className="flex items-center justify-between gap-2 text-[11px] italic text-ink-4">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">✈</span> Inter-country legs
              </span>
              <span className="shrink-0">estimate separately</span>
            </li>
          )}
          <li className="flex items-center justify-between gap-2 border-t border-surface-3 pt-1.5 text-[11px] font-bold text-ink-1">
            <span>Subtotal · flights extra</span>
            <span className="flex shrink-0 items-center gap-1 text-emerald-800">
              {composedPlan.costPerPerson}
              <span title={planCostBasisLabel(composedPlan)} aria-label={planCostBasisLabel(composedPlan)}>
                {planCostBasisIcon(composedPlan)}
              </span>
            </span>
          </li>
        </ul>
      </RailSection>

      {seasonCountries.length > 0 && (
        <RailSection title="When to go" hint="by country" variant={v} count={seasonCountries.length}>
          <div className="space-y-3">
            {seasonCountries.map((c) => (
              <div key={c.name}>
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-ink-1">
                  <span aria-hidden="true">{getCountryFlag(c.name)}</span>
                  {c.name}
                </p>
                <MonthHeatmap bestMonths={c.bestMonths ?? []} worstMonths={c.worstMonths ?? []} />
              </div>
            ))}
          </div>
        </RailSection>
      )}

      {tipCountries.length > 0 && (
        <RailSection title="Watch-outs & tips" hint="by country" variant={v} count={tipCountries.length}>
          <div className="space-y-3">
            {tipCountries.map((c) => (
              <div key={c.name} className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink-1">
                  <span aria-hidden="true">{getCountryFlag(c.name)}</span>
                  {c.name}
                </p>
                {c.stopoverNote && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">✈️ Stopover</p>
                    <p className="text-[11px] leading-relaxed text-emerald-900">{c.stopoverNote}</p>
                  </div>
                )}
                {(c.avoid?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">⚠️ Watch out for</p>
                    <ul className="space-y-1">
                      {(c.avoid ?? []).map((item) => (
                        <li key={item} className="flex gap-1.5 text-[11px] leading-snug text-amber-800">
                          <span className="mt-0.5 shrink-0" aria-hidden="true">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(c.combo?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-4">Pairs well with</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(c.combo ?? []).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2"
                        >
                          <span aria-hidden="true">{getCountryFlag(name)}</span> {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </RailSection>
      )}

      {onSaveNotes && (
        <RailSection title="Notes" hint="just for you" variant={v}>
          <PlanNotesSection notes={notes} onSave={onSaveNotes} />
        </RailSection>
      )}

      {countries.length > 0 && (
        <RailSection title="Before you go" hint="learn, visas, links" variant={v}>
          <div className={multi ? "space-y-4" : undefined}>
            {countries.map((c) => (
              <CountryBeforeYouGo key={c.name} country={c} homeCountry={homeCountry} showHeading={multi} />
            ))}
          </div>
        </RailSection>
      )}
    </div>
  );
}

const TripContextRail = memo(TripContextRailInner);
export default TripContextRail;
