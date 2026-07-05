import { useState, useMemo } from "react";
import type { Country } from "../../core/types";
import type { TripPlan } from "../../core/utils/tripPlans";
import { planCostBasisIcon, planCostBasisLabel } from "../../core/utils/tripPlans";
import type { CountryRule } from "../../core/data/itineraryRules";
import { TRANSPORT_EMOJI } from "../../core/utils/transport";
import ModalShell from "../shared/ModalShell";
import ItineraryView, { groupDays } from "./itinerary/ItineraryView";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  plan: TripPlan;
  country: Country;
  rule?: CountryRule | null;
  onClose: () => void;
}

export default function ItineraryModal({ plan, country, rule, onClose }: Props) {
  const groups = useMemo(() => groupDays(plan.days, rule), [plan.days, rule]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [jumpCity, setJumpCity] = useState<string | null>(null);

  return (
    <ModalShell
      open={true}
      onClose={onClose}
      label={`Itinerary — ${country.name}`}
      className="bg-white md:rounded-2xl shadow-2xl w-full max-w-[720px] h-full md:h-auto md:max-h-[88vh] flex flex-col overflow-hidden"
    >

        {/* ── Header — compact on mobile ──────────────────────────────────── */}
        <div className="px-4 py-3 md:px-6 md:py-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Day-by-Day Itinerary</p>
            <h2 className="text-lg md:text-2xl font-black leading-tight truncate">{country.name}</h2>
            <div className="flex items-center gap-2 md:gap-3 mt-1">
              <span className="text-xs md:text-sm font-semibold text-slate-300">{plan.duration}</span>
              <span className="text-slate-600 text-xs md:text-sm">·</span>
              <span className="text-xs md:text-sm font-bold text-white">{plan.costPerPerson}</span>
              <span className="text-[10px] md:text-[11px] text-slate-400" title={planCostBasisLabel(plan)} aria-label={planCostBasisLabel(plan)}>{planCostBasisIcon(plan)}</span>
            </div>

            {/* City route navigation */}
            {groups.length > 1 && (
              <>
                {/* Desktop: wrapped pills */}
                <div className="hidden md:flex flex-wrap items-center gap-1.5 mt-3">
                  {groups.map((g, i) => (
                    <span key={g.name} className="flex items-center gap-1.5">
                      <button
                        onClick={() => document.getElementById(`city-${g.name}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2.5 py-1 min-h-[28px] rounded-full hover:bg-white/20 hover:text-white transition-colors cursor-pointer focus-ring"
                      >
                        {g.name}
                      </button>
                      {i < groups.length - 1 && g.transport && (
                        <span className="text-sm opacity-60">{TRANSPORT_EMOJI[g.transport.type]}</span>
                      )}
                      {i < groups.length - 1 && !g.transport && (
                        <span className="text-slate-600 text-xs">→</span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Mobile: dropdown */}
                <div className="md:hidden mt-2 relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-white/10 px-3 py-1.5 min-h-[32px] rounded-full hover:bg-white/20 hover:text-white transition-colors focus-ring"
                  >
                    <span>{jumpCity ?? "Jump to city…"}</span>
                    <span className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 min-w-[160px] py-1" role="listbox">
                      {groups.map((g) => (
                        <button
                          key={g.name}
                          role="option"
                          aria-selected={jumpCity === g.name}
                          onClick={() => {
                            document.getElementById(`city-${g.name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                            setJumpCity(g.name);
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 min-h-[36px] text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors focus-ring"
                        >
                          {g.name}
                          <span className="ml-2 text-[9px] text-slate-500">{g.days.length}d</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 md:p-2 rounded-xl transition-colors text-base leading-none shrink-0 focus-ring"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Warning — inside scroll on mobile */}
        <div className="hidden md:block">
          {plan.warning && (
            <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 shrink-0">
              <p className="text-xs text-amber-700 leading-snug">⚠️ {plan.warning}</p>
            </div>
          )}
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Warning — inside scroll on mobile for more space */}
          {plan.warning && (
            <div className="md:hidden px-4 py-2 bg-amber-50 border-b border-amber-100">
              <p className="text-xs text-amber-700 leading-snug">⚠️ {plan.warning}</p>
            </div>
          )}

          <ItineraryView plan={plan} rule={rule} />

          <div className="h-4" />
        </div>
    </ModalShell>
  );
}
