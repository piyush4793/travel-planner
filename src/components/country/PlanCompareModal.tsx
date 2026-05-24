import { useState } from "react";
import { createPortal } from "react-dom";
import type { TripPlan, DayEntry } from "../../utils/tripPlans";

type PlanOption = {
  id: string;
  label: string;
  plan: TripPlan;
};

type Props = {
  options: PlanOption[];
  onClose: () => void;
};

function extractCities(days: DayEntry[]): string[] {
  const cities: string[] = [];
  for (const day of days) {
    const m = day.label.match(/[—\-–]\s*(.+)$/);
    const city = m ? m[1].trim() : "";
    if (city && cities[cities.length - 1] !== city) cities.push(city);
  }
  return cities;
}

function PlanColumn({ plan, label }: { plan: TripPlan; label: string }) {
  const cities = extractCities(plan.days);

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <p className="text-xs font-black text-slate-800 truncate">{label}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-semibold text-blue-700">{plan.duration}</span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] font-bold text-slate-700">{plan.costPerPerson}</span>
        </div>
        {cities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {cities.map((city, i) => (
              <span key={city} className="flex items-center gap-1">
                <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{city}</span>
                {i < cities.length - 1 && <span className="text-slate-300 text-[9px]">→</span>}
              </span>
            ))}
          </div>
        )}
      </div>

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

        {/* Quick stat diff row */}
        {leftPlan && rightPlan && (
          <div className="px-6 py-2.5 border-b border-slate-100 grid grid-cols-2 gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-blue-700">{leftPlan.plan.days.length} days</span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-semibold text-slate-600">{extractCities(leftPlan.plan.days).length} cities</span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-bold text-emerald-700">{leftPlan.plan.costPerPerson}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-blue-700">{rightPlan.plan.days.length} days</span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-semibold text-slate-600">{extractCities(rightPlan.plan.days).length} cities</span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-bold text-emerald-700">{rightPlan.plan.costPerPerson}</span>
            </div>
          </div>
        )}

        {/* Columns */}
        <div className="flex-1 flex divide-x divide-slate-200 overflow-hidden min-h-0">
          {leftPlan && <PlanColumn plan={leftPlan.plan} label={leftPlan.label} />}
          {rightPlan && <PlanColumn plan={rightPlan.plan} label={rightPlan.label} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
