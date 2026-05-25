import { useState } from "react";
import { createPortal } from "react-dom";
import type { LLMTripPlanResult, LLMDayEntry, LLMCityInfo } from "../../utils/ai/llmTransform";
import { type TransportType, TRANSPORT_EMOJI, detectTransport } from "../../utils/transport";
import type { SavedAiPlan } from "../../hooks/useAiPlanStore";
import { formatPlanLabel } from "../../utils/planDiff";

type CityGroup = {
  name: string;
  days: LLMDayEntry[];
  transport?: { type: TransportType; label: string; cost?: string };
};

function groupDays(days: LLMDayEntry[], cities: LLMCityInfo[]): CityGroup[] {
  const groups: CityGroup[] = [];
  for (const day of days) {
    const m = day.label.match(/—\s*(.+)$/);
    const city = m ? m[1].trim() : "";
    if (!city) continue;
    const last = groups[groups.length - 1];
    if (last && last.name === city) {
      last.days.push(day);
    } else {
      groups.push({ name: city, days: [day] });
    }
  }

  // Use LLM-provided city transport data when available, fallback to detectTransport
  const cityMap = new Map(cities.map((c) => [c.name, c]));
  for (let i = 1; i < groups.length; i++) {
    const prevCity = cityMap.get(groups[i - 1].name);
    if (prevCity?.transportToNext) {
      const t = prevCity.transportToNext;
      groups[i].transport = { type: t.type, label: t.label, cost: t.cost };
    } else {
      const from = groups[i - 1].name;
      const to = groups[i].name;
      const label = `${from} → ${to}`;
      groups[i].transport = { type: detectTransport(label), label };
    }
  }
  return groups;
}

interface Props {
  result: LLMTripPlanResult;
  onClose: () => void;
  onSaveToList?: (destinationName: string) => "saved" | "exists";
  existingPlans?: SavedAiPlan[];
  canAddNew?: boolean;
  maxPlans?: number;
  onSavePlan?: () => void;
  onReplacePlan?: (planId: string) => void;
}

export default function AiItineraryModal({ result, onClose, onSaveToList, existingPlans = [], canAddNew = true, maxPlans = 4, onSavePlan, onReplacePlan }: Props) {
  const { plan } = result;
  const groups = groupDays(plan.days, result.cities);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "exists">("idle");
  const [showComparison, setShowComparison] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-br from-emerald-900 to-slate-800 text-white shrink-0 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">✨ AI-Generated Itinerary</p>
            </div>
            <h2 className="text-2xl font-black leading-tight">{result.destinationName}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm font-semibold text-slate-300">{plan.duration}</span>
              <span className="text-slate-600 text-sm">·</span>
              <span className="text-sm font-bold text-white">{plan.costPerPerson}</span>
              <span className="text-[11px] text-slate-400">per person</span>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-[10px] text-emerald-300/70 bg-white/10 px-2 py-0.5 rounded-full">
                From: {result.originCountry}
              </span>
              <span className="text-[10px] text-emerald-300/70 bg-white/10 px-2 py-0.5 rounded-full">
                {result.travelers} traveler{result.travelers !== 1 ? "s" : ""}
              </span>
              <span className="text-[10px] text-emerald-300/70 bg-white/10 px-2 py-0.5 rounded-full">
                {result.budgetLevel}
              </span>
            </div>

            {/* City route summary */}
            {groups.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {groups.map((g, i) => (
                  <span key={g.name} className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                      {g.name}
                    </span>
                    {i < groups.length - 1 && g.transport ? (
                      <span className="text-sm opacity-60">{TRANSPORT_EMOJI[g.transport.type]}</span>
                    ) : i < groups.length - 1 ? (
                      <span className="text-slate-600 text-xs">→</span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors text-base leading-none shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body — meta sections + day cards scroll together for full modal use */}
        <div className="flex-1 overflow-y-auto">

          {/* Assumptions */}
          {result.assumptions.length > 0 && (
            <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">Assumptions Made</p>
              <p className="text-[11px] text-blue-600 leading-relaxed">{result.assumptions.join(" · ")}</p>
            </div>
          )}

          {/* Warning */}
          {plan.warning && (
            <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100">
              <p className="text-xs text-amber-700 leading-snug">⚠️ {plan.warning}</p>
            </div>
          )}

          {/* Destination meta info */}
          <MetaSection meta={result.meta} />
          {groups.map((group, gi) => (
            <div key={group.name + gi}>

              {/* Transport separator */}
              {gi > 0 && (
                <div className="mx-6 my-4 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xl shrink-0">{group.transport ? TRANSPORT_EMOJI[group.transport.type] : "→"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700">
                      {groups[gi - 1].name} → {group.name}
                    </p>
                    {group.transport && (
                      <p className="text-[11px] text-slate-500 truncate">{group.transport.label}</p>
                    )}
                  </div>
                  {group.transport?.cost && (
                    <span className="text-xs font-bold text-slate-700 shrink-0 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {group.transport.cost}
                    </span>
                  )}
                </div>
              )}

              {/* City header */}
              <div className="px-6 pt-5 pb-2 flex items-center gap-3">
                <h3 className="text-base font-black text-slate-900">{group.name}</h3>
                <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                  {group.days.length} day{group.days.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Day cards */}
              <div className="px-6 pb-2 space-y-3">
                {group.days.map((day, di) => (
                  <div key={di} className="border border-slate-150 rounded-xl overflow-hidden shadow-sm itinerary-day"
                    style={{ animationDelay: `${(gi * 3 + di) * 75}ms` }}>

                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex-1">
                        {day.label}
                      </p>
                      {day.theme && (
                        <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                          {day.theme}
                        </span>
                      )}
                    </div>

                    <div className="px-4 py-3">
                      <ul className="space-y-2">
                        {day.activities.map((a, ai) => {
                          const [main, ...rest] = a.split(" — ");
                          const detail = rest.join(" — ");
                          return (
                            <li key={ai} className="flex gap-2.5 leading-snug">
                              <span className="text-slate-300 shrink-0 mt-0.5 text-sm">›</span>
                              <span className="text-sm text-slate-700 flex-1">
                                {main}
                                {detail && (
                                  <span className="text-slate-400 text-xs font-medium ml-1.5">{detail}</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      {day.hotels && day.hotels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                          {day.hotels.map((h) => (
                            <span key={h} className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                              🏨 {h}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Cost breakdown */}
                      {day.costBreakdown && Object.keys(day.costBreakdown).length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cost Estimate</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {day.costBreakdown.flights && (
                              <span className="text-[10px] text-slate-500">✈️ {day.costBreakdown.flights}</span>
                            )}
                            {day.costBreakdown.hotels && (
                              <span className="text-[10px] text-slate-500">🏨 {day.costBreakdown.hotels}</span>
                            )}
                            {day.costBreakdown.excursions && (
                              <span className="text-[10px] text-slate-500">🎯 {day.costBreakdown.excursions}</span>
                            )}
                            {day.costBreakdown.transfers && (
                              <span className="text-[10px] text-slate-500">🚌 {day.costBreakdown.transfers}</span>
                            )}
                            {day.costBreakdown.total && (
                              <span className="text-[10px] font-semibold text-slate-700">Total: {day.costBreakdown.total}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Booking suggestions */}
                      {day.bookingSuggestions && day.bookingSuggestions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recommended Tours</p>
                          <div className="space-y-1">
                            {day.bookingSuggestions.map((s, si) => (
                              <p key={si} className="text-[10px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                🎟️ {s}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="h-4" />
        </div>

        {/* Plan comparison panel */}
        {showComparison && existingPlans.length > 0 && (
          <div className="px-6 py-3 bg-indigo-50 border-t border-indigo-100 shrink-0 space-y-2">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              {existingPlans.length} existing plan{existingPlans.length !== 1 ? "s" : ""} for {result.destinationName}
            </p>

            {/* New plan summary */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">New Plan</p>
              <p className="text-[11px] text-emerald-700">{formatPlanLabel(result)}</p>
            </div>

            {/* Existing plans */}
            {existingPlans.map((ep) => (
              <div key={ep.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-600 truncate">{formatPlanLabel(ep.result, ep.savedAt)}</p>
                </div>
                {onReplacePlan && (
                  <button
                    onClick={() => { onReplacePlan(ep.id); setPlanSaved(true); setShowComparison(false); }}
                    className="text-[10px] text-red-500 hover:text-red-600 font-semibold shrink-0"
                  >
                    Replace
                  </button>
                )}
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              {canAddNew && onSavePlan ? (
                <button
                  onClick={() => { onSavePlan(); setPlanSaved(true); setShowComparison(false); }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg transition-colors"
                >
                  + Add as New ({existingPlans.length}/{maxPlans})
                </button>
              ) : (
                <p className="text-[10px] text-slate-400">Max {maxPlans} plans reached — replace one above</p>
              )}
              <button
                onClick={() => setShowComparison(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Practical Notes</p>
              <p className="text-xs text-slate-500 leading-relaxed">{plan.note}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Save Plan button */}
              {onSavePlan && !planSaved && !showComparison && (
                <button
                  onClick={() => {
                    if (existingPlans.length > 0) {
                      setShowComparison(true);
                    } else {
                      onSavePlan();
                      setPlanSaved(true);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg transition-colors"
                >
                  💾 Save Plan
                </button>
              )}
              {planSaved && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  ✅ Plan saved
                </span>
              )}

              {/* Save to My List */}
              {onSaveToList && (
                saveStatus === "saved" ? (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                    ✅ In My List
                  </span>
                ) : saveStatus === "exists" ? (
                  <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5">
                    Already in My List
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const status = onSaveToList(result.destinationName);
                      setSaveStatus(status);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg transition-colors"
                  >
                    📋 Save to My List
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MetaSection({ meta }: { meta: LLMTripPlanResult["meta"] }) {
  const hasMeta = meta.bestMonths.length > 0 || meta.thingsToAvoid.length > 0 || meta.comboCountries.length > 0;
  if (!hasMeta) return null;

  return (
    <div className="px-6 py-3 border-b border-slate-100 space-y-2">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {meta.bestMonths.length > 0 && (
          <MetaChips label="Best Months" items={meta.bestMonths} color="emerald" />
        )}
        {meta.worstMonths.length > 0 && (
          <MetaChips label="Avoid" items={meta.worstMonths} color="red" />
        )}
        {meta.comboCountries.length > 0 && (
          <MetaChips label="Combine With" items={meta.comboCountries} color="indigo" />
        )}
      </div>
      {meta.thingsToAvoid.length > 0 && (
        <div>
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1">Things to Avoid</p>
          <ul className="space-y-0.5">
            {meta.thingsToAvoid.map((t, i) => (
              <li key={i} className="text-[10px] text-amber-700">⚠ {t}</li>
            ))}
          </ul>
        </div>
      )}
      {meta.visaTips && (
        <p className="text-[10px] text-slate-500">🛂 {meta.visaTips}</p>
      )}
      {meta.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meta.highlights.map((h, i) => (
            <span key={i} className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">✨ {h}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const META_COLORS = {
  emerald: { heading: "text-emerald-600", chip: "text-emerald-700 bg-emerald-50" },
  red: { heading: "text-red-500", chip: "text-red-600 bg-red-50" },
  indigo: { heading: "text-indigo-500", chip: "text-indigo-600 bg-indigo-50" },
} as const;

function MetaChips({ label, items, color }: { label: string; items: string[]; color: keyof typeof META_COLORS }) {
  const c = META_COLORS[color];
  return (
    <div>
      <p className={`text-[9px] font-bold ${c.heading} uppercase tracking-wider mb-1`}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item} className={`text-[10px] ${c.chip} px-1.5 py-0.5 rounded`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
