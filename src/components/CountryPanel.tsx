import { useState, useEffect } from "react";
import type { Country, PlanStyle } from "../types";
import { STYLE_META, PLAN_STYLE_META, PLAN_STYLES } from "../utils/travelStyles";
import { generateTripPlan } from "../utils/tripPlans";
import Tooltip from "./Tooltip";

type Props = {
  country: Country | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isVisited: boolean;
  onToggleVisited: () => void;
  onFilterExperience: (tag: string) => void;
  activeExperiences: string[];
  onEdit: () => void;
  onDelete: () => void;
  onUpdateNotes: (notes: string) => void;
};

export default function CountryPanel({
  country, onClose,
  isFavorite, onToggleFavorite,
  isVisited, onToggleVisited,
  onFilterExperience, activeExperiences,
  onEdit, onDelete, onUpdateNotes,
}: Props) {
  const [activeStyle, setActiveStyle] = useState<PlanStyle | null>(null);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [customDays, setCustomDays] = useState(7);
  const [notes, setNotes] = useState(country?.notes ?? "");

  useEffect(() => {
    setActiveStyle(null);
    setSelectedCities([]);
    setCustomDays(7);
    setNotes(country?.notes ?? "");
  }, [country?.name]);

  function toggleCity(name: string) {
    setSelectedCities(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  }

  return (
    <div className={`absolute top-0 right-0 h-full w-80 bg-white shadow-2xl z-20 flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
      country ? "translate-x-0" : "translate-x-full"
    }`}>
      {country && (
        <>
          {/* Header */}
          <div className="px-5 py-4 border-b bg-gradient-to-br from-slate-50 to-white shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{country.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">{country.budget} · from India</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={onToggleFavorite}
                  className={`text-xl p-1 rounded-lg transition-colors ${isFavorite ? "text-yellow-400 bg-yellow-50" : "text-gray-300 hover:text-yellow-300"}`}>
                  {isFavorite ? "★" : "☆"}
                </button>
                <button onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-lg leading-none p-1 rounded-lg transition-colors">
                  ✕
                </button>
              </div>
            </div>

            {/* Recommended travel style badges */}
            {country.travelStyle && country.travelStyle.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {country.travelStyle.map((s) => {
                  const m = STYLE_META[s];
                  return (
                    <span key={s} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.badge}`}>
                      {m.icon} {m.label}
                      <Tooltip text={m.description} />
                    </span>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={onToggleVisited}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isVisited ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {isVisited ? "✓ Visited" : "○ Mark visited"}
              </button>
              <button onClick={onEdit} className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">Edit</button>
              <button onClick={onDelete} className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100">Delete</button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* ── Trip Planner ── */}
            <Section label="Plan your trip">
              {/* Style buttons */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {PLAN_STYLES.map((s) => {
                  const meta = PLAN_STYLE_META[s];
                  const on = activeStyle === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setActiveStyle(on ? null : s)}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${
                        on ? meta.activeForm : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-base leading-none">{meta.icon}</span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom days input */}
              {activeStyle === "custom" && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-violet-50 rounded-xl border border-violet-200">
                  <span className="text-xs text-violet-700 font-semibold shrink-0">Days to travel:</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-sm font-bold text-center bg-white border border-violet-300 rounded-lg px-2 py-1 outline-none focus:border-violet-500"
                  />
                  <span className="text-xs text-violet-500">day{customDays !== 1 ? "s" : ""}</span>
                </div>
              )}

              {/* City selection */}
              {activeStyle && country.cities && country.cities.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Select cities to visit
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {country.cities.map((city) => {
                      const on = selectedCities.includes(city.name);
                      return (
                        <button
                          key={city.name}
                          onClick={() => toggleCity(city.name)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            on
                              ? "bg-slate-700 text-white border-slate-700"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {city.name}
                        </button>
                      );
                    })}
                  </div>
                  {selectedCities.length > 0 && (
                    <button
                      onClick={() => setSelectedCities([])}
                      className="text-[10px] text-gray-400 hover:text-gray-600 mt-1"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              )}

              {activeStyle && (
                <TripPlanCard
                  country={country}
                  style={activeStyle}
                  selectedCities={selectedCities}
                  customDays={customDays}
                />
              )}
            </Section>

            <Section label="Best months">
              <div className="flex flex-wrap gap-1.5">
                {country.bestMonths.map((m) => (
                  <span key={m} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-semibold">{m}</span>
                ))}
              </div>
            </Section>

            {country.worstMonths && country.worstMonths.length > 0 && (
              <Section label="Avoid months">
                <div className="flex flex-wrap gap-1.5">
                  {country.worstMonths.map((m) => (
                    <span key={m} className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">{m}</span>
                  ))}
                </div>
              </Section>
            )}

            <Section label="Experiences — tap to filter">
              <div className="flex flex-wrap gap-1.5">
                {country.experiences.map((e) => {
                  const active = activeExperiences.includes(e);
                  return (
                    <button key={e} onClick={() => onFilterExperience(e)}
                      className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-all ${
                        active ? "bg-blue-600 text-white shadow-sm" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}>
                      {e}
                    </button>
                  );
                })}
              </div>
            </Section>

            {country.cities && country.cities.length > 0 && (
              <Section label="Cities to visit">
                <div className="space-y-2.5">
                  {country.cities.map((city) => (
                    <div key={city.name} className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-800">{city.name}</p>
                        {city.bestMonths && city.bestMonths.length > 0 && (
                          <div className="flex gap-1">
                            {city.bestMonths.slice(0, 3).map((m) => (
                              <span key={m} className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">{m.slice(0, 3)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {city.notes && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{city.notes}</p>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {country.stopoverNote && (
              <Section label="Stopover tip ✈️">
                <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-blue-800 leading-relaxed">{country.stopoverNote}</p>
                </div>
              </Section>
            )}

            {country.avoid && country.avoid.length > 0 && (
              <Section label="Watch out for">
                <ul className="space-y-1.5">
                  {country.avoid.map((a) => (
                    <li key={a} className="text-sm text-gray-600 flex gap-2 leading-snug">
                      <span className="text-amber-500 mt-0.5 shrink-0 font-bold">!</span>{a}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {country.combo && country.combo.length > 0 && (
              <Section label="Combine with">
                <div className="flex flex-wrap gap-1.5">
                  {country.combo.map((c) => (
                    <span key={c} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-semibold border border-purple-200">{c}</span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Highlighted in purple on the map</p>
              </Section>
            )}

            {country.links && country.links.length > 0 && (
              <Section label="Useful links">
                <div className="space-y-2">
                  {country.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-blue-700 transition-colors group"
                    >
                      <span className="text-base">🔗</span>
                      <span className="flex-1 truncate">{link.label}</span>
                      <svg className="w-3 h-3 text-gray-400 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </Section>
            )}

            <Section label="My notes">
              <textarea
                className="w-full text-sm text-gray-700 bg-amber-50 rounded-xl px-3 py-2.5 resize-none outline-none border border-transparent focus:border-amber-300 placeholder:text-gray-400 leading-relaxed transition-colors"
                rows={4}
                placeholder="Jot down ideas, reminders, or anything to remember about this destination..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => onUpdateNotes(notes)}
              />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function TripPlanCard({ country, style, selectedCities, customDays }: {
  country: Country;
  style: PlanStyle;
  selectedCities: string[];
  customDays: number;
}) {
  const plan = generateTripPlan(country, style, selectedCities, customDays);
  const meta = PLAN_STYLE_META[style];

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      {/* Cost header */}
      <div className={`flex items-center justify-between px-3 py-2.5 ${meta.badge}`}>
        <span className="text-xs font-bold">{meta.icon} {plan.duration}</span>
        <span className="text-xs font-bold">{plan.costPerPerson} / person</span>
      </div>

      {/* Warning */}
      {plan.warning && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-[11px] text-amber-700 leading-snug">{plan.warning}</p>
        </div>
      )}

      {/* Days */}
      <div className="px-3 py-3 space-y-3.5 bg-white">
        {plan.days.map((day, i) => (
          <div key={i}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{day.label}</p>
            <ul className="space-y-1">
              {day.activities.map((a, j) => (
                <li key={j} className="text-[11px] text-gray-600 flex gap-1.5 leading-snug">
                  <span className="text-gray-300 shrink-0 mt-0.5">›</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Note */}
        <p className="text-[10px] text-gray-400 italic leading-snug border-t border-gray-100 pt-2.5">
          {plan.note}
        </p>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}
