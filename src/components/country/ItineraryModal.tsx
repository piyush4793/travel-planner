import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Country } from "../../types";
import type { TripPlan, DayEntry } from "../../utils/tripPlans";
import { extractCityFromLabel } from "../../utils/tripPlans";
import type { CountryRule } from "../../data/itineraryRules";
import { type TransportType, TRANSPORT_EMOJI, detectTransport } from "../../utils/transport";
import { buildRoute } from "../../utils/googleMapsRoute";

// ─── Day grouping ─────────────────────────────────────────────────────────────

type CityGroup = {
  name: string;
  days: DayEntry[];
  transport?: { type: TransportType; label: string; cost?: string };
};

function groupDays(days: DayEntry[], rule?: CountryRule | null): CityGroup[] {
  const groups: CityGroup[] = [];
  for (const day of days) {
    const city = extractCityFromLabel(day.label);
    if (!city) continue;
    const last = groups[groups.length - 1];
    if (last && last.name === city) {
      last.days.push(day);
    } else {
      groups.push({ name: city, days: [day] });
    }
  }

  if (rule) {
    groups.forEach((g, i) => {
      if (i === 0) return;
      const prev = groups[i - 1];
      const conn = rule.connections.find(
        (c) => (c.from === prev.name && c.to === g.name) || (c.from === g.name && c.to === prev.name)
      );
      if (conn) {
        g.transport = { type: detectTransport(conn.method), label: conn.method, cost: conn.cost };
      }
    });
  }
  return groups;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  plan: TripPlan;
  country: Country;
  rule?: CountryRule | null;
  onClose: () => void;
}

export default function ItineraryModal({ plan, country, rule, onClose }: Props) {
  const groups = groupDays(plan.days, rule);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[88vh] flex flex-col overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white shrink-0 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Day-by-Day Itinerary</p>
            <h2 className="text-2xl font-black leading-tight">{country.name}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm font-semibold text-slate-300">{plan.duration}</span>
              <span className="text-slate-600 text-sm">·</span>
              <span className="text-sm font-bold text-white">{plan.costPerPerson}</span>
              <span className="text-[11px] text-slate-400">per person</span>
            </div>

            {/* City route summary — clickable to jump */}
            {groups.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {groups.map((g, i) => (
                  <span key={g.name} className="flex items-center gap-1.5">
                    <button
                      onClick={() => document.getElementById(`city-${g.name}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
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
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors text-base leading-none shrink-0 mt-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Warning */}
        {plan.warning && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 shrink-0">
            <p className="text-xs text-amber-700 leading-snug">⚠️ {plan.warning}</p>
          </div>
        )}

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={group.name}>

              {/* Transport separator between cities */}
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
              <div id={`city-${group.name}`} className="px-6 pt-5 pb-2 flex items-center gap-3 scroll-mt-2">
                <h3 className="text-base font-black text-slate-900">{group.name}</h3>
                <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                  {group.days.length} day{group.days.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Day cards */}
              <div className="px-6 pb-2 space-y-3">
                {group.days.map((day, di) => (
                  <DayCard key={di} day={day} city={group.name} rule={rule} />
                ))}
              </div>
            </div>
          ))}
          <div className="h-4" />
        </div>

        {/* ── Footer: practical notes ──────────────────────────────────────── */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Practical Notes</p>
          <p className="text-xs text-slate-500 leading-relaxed">{plan.note}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Parse activity string into name and cost/detail parts */
function parseActivity(a: string): { name: string; cost?: string; detail?: string } {
  const costMatch = a.match(/^(.+?)\s*\(([₹$€£][\d,.]+[^)]*)\)\s*$/);
  if (costMatch) return { name: costMatch[1].trim(), cost: costMatch[2] };
  const dashIdx = a.indexOf(" — ");
  if (dashIdx > 0) return { name: a.slice(0, dashIdx), detail: a.slice(dashIdx + 3) };
  return { name: a };
}

function searchUrl(query: string, city: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${city}`)}`;
}

function mapsUrl(query: string, city: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${query}, ${city}`)}`;
}

function DayCard({ day, city, rule }: { day: DayEntry; city: string; rule?: CountryRule | null }) {
  const [expanded, setExpanded] = useState(true);

  const cityRule = rule?.cities[city];
  const ruleDay = day.theme && cityRule
    ? cityRule.days.find((d) => d.theme === day.theme)
    : undefined;

  const routeInfo = buildRoute(day.activities, city);

  return (
    <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 w-full text-left hover:bg-slate-100 transition-colors"
      >
        <span className={`text-[9px] text-slate-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}>▸</span>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex-1">
          {day.label}
        </p>
        {!expanded && (
          <span className="text-[9px] text-slate-400 font-medium shrink-0">
            {day.activities.length} activities
          </span>
        )}
        {day.theme && (
          <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
            {day.theme}
          </span>
        )}
        {routeInfo && (
          <a
            href={routeInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] font-semibold text-blue-500 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full shrink-0 transition-colors"
            title="Open day route in Google Maps"
          >
            🗺️ Route
          </a>
        )}
      </button>

      <div className={`grid transition-all duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-4 py-3">
            <ul className="space-y-2">
              {day.activities.map((a, ai) => {
                const parsed = parseActivity(a);
                const letter = routeInfo?.labels.get(ai);
                return (
                  <li key={ai} className="flex gap-2.5 leading-snug group">
                    {letter ? (
                      <span className="w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{letter}</span>
                    ) : (
                      <span className="text-slate-300 shrink-0 mt-0.5 text-sm">›</span>
                    )}
                    <span className="text-sm text-slate-700 flex-1">
                      {parsed.name}
                      {parsed.cost && (
                        <span className="text-emerald-600 text-xs font-semibold ml-1.5">({parsed.cost})</span>
                      )}
                      {parsed.detail && (
                        <span className="text-slate-400 text-xs font-medium ml-1.5">{parsed.detail}</span>
                      )}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      <a href={mapsUrl(parsed.name, city)} target="_blank" rel="noopener noreferrer"
                        className="text-[9px] text-blue-400 hover:text-blue-600 px-1" title="View on Google Maps">📍</a>
                      <a href={searchUrl(parsed.name, city)} target="_blank" rel="noopener noreferrer"
                        className="text-[9px] text-blue-400 hover:text-blue-600 px-1" title="Search for booking/info">🔍</a>
                    </span>
                  </li>
                );
              })}
            </ul>

            {ruleDay && ruleDay.meals && ruleDay.meals.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">🍽 Eat:</span>
                {ruleDay.meals.map((m) => (
                  <a key={m} href={mapsUrl(m, city)} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full hover:bg-orange-100 transition-colors">
                    {m}
                  </a>
                ))}
              </div>
            )}

            {day.hotels && day.hotels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                {day.hotels.map((h) => {
                  const hotelName = h.split(" — ")[0];
                  return (
                    <a key={h} href={searchUrl(`${hotelName} hotel booking`, city)} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors">
                      🏨 {h}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
