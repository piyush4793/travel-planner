import { useState } from "react";
import { createPortal } from "react-dom";
import type { TripPlan } from "../../utils/tripPlans";
import { extractPlanCities, isRealCity, normalizeCityName } from "../../utils/tripPlans";

type PlanOption = {
  id: string;
  label: string;
  plan: TripPlan;
};

type Props = {
  options: PlanOption[];
  onClose: () => void;
};

function avgActivities(plan: TripPlan): number {
  if (plan.days.length === 0) return 0;
  return Math.round(plan.days.reduce((s, d) => s + d.activities.length, 0) / plan.days.length * 10) / 10;
}

function hasHotels(plan: TripPlan): boolean {
  return plan.days.some((d) => d.hotels && d.hotels.length > 0);
}

function SummaryCard({ leftPlan, rightPlan }: { leftPlan: PlanOption; rightPlan: PlanOption }) {
  const l = leftPlan.plan;
  const r = rightPlan.plan;
  const lCitiesRaw = extractPlanCities(l.days).filter(isRealCity);
  const rCitiesRaw = extractPlanCities(r.days).filter(isRealCity);
  const lAvg = avgActivities(l);
  const rAvg = avgActivities(r);

  // Case-insensitive city comparison
  const rNormSet = new Set(rCitiesRaw.map(normalizeCityName));
  const lNormSet = new Set(lCitiesRaw.map(normalizeCityName));
  const shared = lCitiesRaw.filter((c) => rNormSet.has(normalizeCityName(c)));
  const uniqueToLeft = lCitiesRaw.filter((c) => !rNormSet.has(normalizeCityName(c)));
  const uniqueToRight = rCitiesRaw.filter((c) => !lNormSet.has(normalizeCityName(c)));

  const stats: { icon: string; label: string; left: string; right: string; leftWins: boolean | null }[] = [
    { icon: "📅", label: "Duration", left: `${l.days.length}d`, right: `${r.days.length}d`, leftWins: l.days.length > r.days.length ? true : l.days.length < r.days.length ? false : null },
    { icon: "💰", label: "Cost", left: l.costPerPerson, right: r.costPerPerson, leftWins: null },
    { icon: "📍", label: "Cities", left: `${lCitiesRaw.length}`, right: `${rCitiesRaw.length}`, leftWins: lCitiesRaw.length > rCitiesRaw.length ? true : lCitiesRaw.length < rCitiesRaw.length ? false : null },
    { icon: "⚡", label: "Activities/day", left: `${lAvg}`, right: `${rAvg}`, leftWins: lAvg > rAvg ? true : lAvg < rAvg ? false : null },
    { icon: "🏨", label: "Hotels", left: hasHotels(l) ? "Yes" : "No", right: hasHotels(r) ? "Yes" : "No", leftWins: hasHotels(l) && !hasHotels(r) ? true : !hasHotels(l) && hasHotels(r) ? false : null },
  ];

  return (
    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white shrink-0 space-y-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-center">
            <span className="text-base">{s.icon}</span>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className={`text-xs font-black ${s.leftWins === true ? "text-emerald-600" : s.leftWins === false ? "text-slate-400" : "text-slate-700"}`}>
                {s.left}
              </span>
              <span className="text-[9px] text-slate-300">vs</span>
              <span className={`text-xs font-black ${s.leftWins === false ? "text-emerald-600" : s.leftWins === true ? "text-slate-400" : "text-slate-700"}`}>
                {s.right}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* City overlap — compact rows */}
      {(shared.length > 0 || uniqueToLeft.length > 0 || uniqueToRight.length > 0) && (
        <div className="space-y-1.5">
          {shared.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-emerald-500 uppercase w-16 shrink-0">Shared</span>
              {shared.map((c) => (
                <span key={c} className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{c}</span>
              ))}
            </div>
          )}
          {uniqueToLeft.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-blue-400 uppercase w-16 shrink-0">Left only</span>
              {uniqueToLeft.map((c) => (
                <span key={c} className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{c}</span>
              ))}
            </div>
          )}
          {uniqueToRight.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-indigo-400 uppercase w-16 shrink-0">Right only</span>
              {uniqueToRight.map((c) => (
                <span key={c} className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanColumn({ plan }: { plan: TripPlan }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Days */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {plan.days.map((day, i) => (
          <div key={i} className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{day.label}</p>
            </div>
            <div className="px-3 py-2 space-y-1">
              {day.activities.map((a, ai) => (
                <p key={ai} className="text-[11px] text-slate-600 leading-snug">
                  <span className="text-slate-300 mr-1.5">›</span>{a}
                </p>
              ))}
              {day.hotels && day.hotels.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">🏨 {day.hotels.join(", ")}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlanCompareModal({ options, onClose }: Props) {
  const [leftId, setLeftId] = useState(options[0]?.id ?? "");
  const [rightId, setRightId] = useState(options[1]?.id ?? options[0]?.id ?? "");

  const leftPlan = options.find((o) => o.id === leftId);
  const rightPlan = options.find((o) => o.id === rightId);

  if (options.length < 2) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white shrink-0 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Compare Plans</p>
            <p className="text-lg font-black">Side-by-Side Comparison</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors text-base leading-none">
            ✕
          </button>
        </div>

        {/* Selectors */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 grid grid-cols-2 gap-4 shrink-0">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Left</label>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Right</label>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary comparison card */}
        {leftPlan && rightPlan && (
          <SummaryCard leftPlan={leftPlan} rightPlan={rightPlan} />
        )}

        {/* Day-by-day columns header */}
        {leftPlan && rightPlan && (
          <div className="px-6 py-2 border-b border-slate-100 grid grid-cols-2 gap-4 shrink-0 bg-white">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {leftPlan.label} — {leftPlan.plan.days.length} days
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {rightPlan.label} — {rightPlan.plan.days.length} days
            </p>
          </div>
        )}

        {/* Columns */}
        <div className="flex-1 flex divide-x divide-slate-200 overflow-hidden min-h-0">
          {leftPlan && <PlanColumn plan={leftPlan.plan} />}
          {rightPlan && <PlanColumn plan={rightPlan.plan} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
