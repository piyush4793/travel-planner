import { createPortal } from "react-dom";
import type { DayEntry } from "../../utils/tripPlans";
import type { LLMTripPlanResult } from "../../utils/ai/llmTransform";
import { type TransportType, TRANSPORT_EMOJI, detectTransport } from "../../utils/transport";

type CityGroup = {
  name: string;
  days: DayEntry[];
  transport?: { type: TransportType; label: string };
};

function groupDays(days: DayEntry[]): CityGroup[] {
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

  // Detect transport between consecutive cities
  for (let i = 1; i < groups.length; i++) {
    const from = groups[i - 1].name;
    const to = groups[i].name;
    const label = `${from} → ${to}`;
    const type = detectTransport(label);
    if (type) {
      groups[i].transport = { type, label };
    }
  }
  return groups;
}

interface Props {
  result: LLMTripPlanResult;
  onClose: () => void;
}

export default function AiItineraryModal({ result, onClose }: Props) {
  const { plan } = result;
  const groups = groupDays(plan.days);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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

        {/* Assumptions */}
        {result.assumptions.length > 0 && (
          <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100 shrink-0">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">Assumptions Made</p>
            <p className="text-[11px] text-blue-600 leading-relaxed">{result.assumptions.join(" · ")}</p>
          </div>
        )}

        {/* Warning */}
        {plan.warning && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 shrink-0">
            <p className="text-xs text-amber-700 leading-snug">⚠️ {plan.warning}</p>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Practical Notes</p>
          <p className="text-xs text-slate-500 leading-relaxed">{plan.note}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
