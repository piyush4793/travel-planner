import { useState, useMemo, useRef, useEffect } from "react";
import type { TripPlan, DayEntry } from "../../../core/utils/tripPlans";
import { extractCityFromLabel } from "../../../core/utils/tripPlans";
import type { CountryRule } from "../../../core/data/itineraryRules";
import { type TransportType, TRANSPORT_EMOJI, detectTransport } from "../../../core/utils/transport";
import { buildRoute } from "../../../core/utils/googleMapsRoute";
import { parseNoteItems } from "../../../core/utils/practicalNotes";

// ─── Day grouping ─────────────────────────────────────────────────────────────

export type CityGroup = {
  name: string;
  days: DayEntry[];
  transport?: { type: TransportType; label: string; cost?: string };
};

/**
 * Collapse a flat day list into consecutive per-city groups and annotate the
 * inter-city transport from the rule connections. Shared by the itinerary body
 * and the modal's jump-to-city navigation so both agree on the city sequence.
 */
export function groupDays(days: DayEntry[], rule?: CountryRule | null): CityGroup[] {
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

// ─── Itinerary body (shared by the modal and the guided Plan tab) ─────────────

export type ItineraryVariant = "default" | "luxury";

/** Per-variant colour tokens so the shared renderer can wear the Country Panel
 *  (slate/blue) or the guided-plan luxury (emerald/ivory) skin without forking. */
type ItinTheme = {
  focusRing: string;
  sepBox: string;
  sepTitle: string;
  sepSub: string;
  sepCost: string;
  cityTitle: string;
  cityBadge: string;
  cardBorder: string;
  cardHead: string;
  chevron: string;
  dayLabel: string;
  dayCount: string;
  themePill: string;
  routeLink: string;
  marker: string;
  bullet: string;
  actText: string;
  actDetail: string;
  actLink: string;
  divider: string;
  eatLabel: string;
  eatPill: string;
  hotelPill: string;
  noteBox: string;
  noteLabel: string;
  noteText: string;
  noteItemLabel: string;
  noteItemText: string;
  copyIdle: string;
  copyDone: string;
};

const ITIN_THEMES: Record<ItineraryVariant, ItinTheme> = {
  default: {
    focusRing: "focus-ring",
    sepBox: "bg-slate-50 border-slate-100",
    sepTitle: "text-slate-700",
    sepSub: "text-slate-500",
    sepCost: "text-slate-700 bg-white border-slate-200",
    cityTitle: "text-slate-900",
    cityBadge: "text-slate-400 bg-slate-100",
    cardBorder: "border-slate-150",
    cardHead: "bg-slate-50 border-slate-100",
    chevron: "text-slate-400",
    dayLabel: "text-slate-500",
    dayCount: "text-slate-400",
    themePill: "text-indigo-600 bg-indigo-50",
    routeLink: "text-blue-500 bg-blue-50 hover:bg-blue-100",
    marker: "bg-blue-500 text-white",
    bullet: "text-slate-300",
    actText: "text-slate-700",
    actDetail: "text-slate-400",
    actLink: "text-blue-400 hover:text-blue-600",
    divider: "border-slate-100",
    eatLabel: "text-slate-400",
    eatPill: "text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100",
    hotelPill: "text-slate-500 bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600",
    noteBox: "bg-slate-50 border-slate-100",
    noteLabel: "text-slate-400",
    noteText: "text-slate-500",
    noteItemLabel: "text-slate-500",
    noteItemText: "text-slate-600",
    copyIdle: "text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600",
    copyDone: "text-emerald-600 bg-emerald-50",
  },
  luxury: {
    focusRing: "focus-ring-emerald",
    sepBox: "bg-[#f4f1e8] border-[#e6e1d4]",
    sepTitle: "text-[#1e2a25]",
    sepSub: "text-[#6f6a5d]",
    sepCost: "text-emerald-800 bg-white border-[#e4dece]",
    cityTitle: "text-[#16241d]",
    cityBadge: "text-[#6f6a5d] bg-[#efeadd]",
    cardBorder: "border-[#e6e1d4]",
    cardHead: "bg-[#f4f1e8] border-[#e6e1d4]",
    chevron: "text-[#a8a293]",
    dayLabel: "text-[#6f6a5d]",
    dayCount: "text-[#a8a293]",
    themePill: "text-emerald-700 bg-emerald-50",
    routeLink: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
    marker: "bg-emerald-700 text-white",
    bullet: "text-[#cfc9b8]",
    actText: "text-[#1e2a25]",
    actDetail: "text-[#6f6a5d]",
    actLink: "text-emerald-500 hover:text-emerald-700",
    divider: "border-[#e6e1d4]",
    eatLabel: "text-[#a8a293]",
    eatPill: "text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100",
    hotelPill: "text-[#6f6a5d] bg-[#f4f1e8] border-[#e4dece] hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700",
    noteBox: "bg-[#f4f1e8] border-[#e6e1d4]",
    noteLabel: "text-[#a8a293]",
    noteText: "text-[#6f6a5d]",
    noteItemLabel: "text-[#6f6a5d]",
    noteItemText: "text-[#4f5a52]",
    copyIdle: "text-[#a8a293] bg-[#f4f1e8] hover:bg-[#efeadd] hover:text-[#6f6a5d]",
    copyDone: "text-emerald-600 bg-emerald-50",
  },
};

interface ItineraryViewProps {
  plan: TripPlan;
  rule?: CountryRule | null;
  variant?: ItineraryVariant;
}

/**
 * The reusable day-by-day itinerary body: transport separators, per-city
 * headers (with `city-<name>` scroll anchors), expandable day cards and the
 * parsed practical notes. Contains no modal chrome (header/close/warnings) so it
 * can be embedded in the modal's scroll body or the guided Plan tab's preview.
 */
export default function ItineraryView({ plan, rule, variant = "default" }: ItineraryViewProps) {
  const groups = useMemo(() => groupDays(plan.days, rule), [plan.days, rule]);
  const t = ITIN_THEMES[variant];

  return (
    <>
      {groups.map((group, gi) => (
        <div key={group.name}>
          {/* Transport separator between cities */}
          {gi > 0 && (
            <div className={`mx-4 md:mx-6 my-3 md:my-4 flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border ${t.sepBox}`}>
              <span className="text-lg md:text-xl shrink-0">{group.transport ? TRANSPORT_EMOJI[group.transport.type] : "→"}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${t.sepTitle}`}>
                  {groups[gi - 1].name} → {group.name}
                </p>
                {group.transport && (
                  <p className={`text-[11px] truncate ${t.sepSub}`}>{group.transport.label}</p>
                )}
              </div>
              {group.transport?.cost && (
                <span className={`text-xs font-bold shrink-0 border px-2 py-0.5 rounded-full ${t.sepCost}`}>
                  {group.transport.cost}
                </span>
              )}
            </div>
          )}

          {/* City header */}
          <div id={`city-${group.name}`} className="px-4 md:px-6 pt-4 md:pt-5 pb-2 flex items-center gap-3 scroll-mt-2">
            <h3 className={`text-base font-black ${t.cityTitle}`}>{group.name}</h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.cityBadge}`}>
              {group.days.length} day{group.days.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Day cards */}
          <div className="px-4 md:px-6 pb-2 space-y-3">
            {group.days.map((day, di) => (
              <DayCard key={di} day={day} city={group.name} rule={rule} t={t} />
            ))}
          </div>
        </div>
      ))}

      {/* Practical notes — parsed into structured items */}
      {plan.note && <PracticalNotes note={plan.note} t={t} />}
    </>
  );
}

// ─── Activity parsing + link helpers ──────────────────────────────────────────

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

// ─── Practical Notes ──────────────────────────────────────────────────────────

function PracticalNotes({ note, t }: { note: string; t: ItinTheme }) {
  const items = parseNoteItems(note);
  const isSingle = items.length === 1 && !items[0].label;

  if (isSingle) {
    return (
      <div className={`mx-4 md:mx-6 my-4 px-4 py-3 rounded-xl border ${t.noteBox}`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${t.noteLabel}`}>Practical Notes</p>
        <p className={`text-xs leading-relaxed ${t.noteText}`}>{note}</p>
      </div>
    );
  }

  return (
    <div className={`mx-4 md:mx-6 my-4 px-4 py-3 rounded-xl border ${t.noteBox}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 ${t.noteLabel}`}>Practical Notes</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-sm shrink-0 mt-px">{item.icon}</span>
            <div className="min-w-0">
              {item.label && (
                <span className={`text-[10px] font-bold uppercase tracking-wide mr-1.5 ${t.noteItemLabel}`}>{item.label}</span>
              )}
              <span className={`text-xs leading-relaxed ${t.noteItemText}`}>{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day card ─────────────────────────────────────────────────────────────────

function DayCard({ day, city, rule, t }: { day: DayEntry; city: string; rule?: CountryRule | null; t: ItinTheme }) {
  const [expanded, setExpanded] = useState(true);

  const cityRule = rule?.cities[city];
  const ruleDay = day.theme && cityRule
    ? cityRule.days.find((d) => d.theme === day.theme)
    : undefined;

  const routeInfo = buildRoute(day.activities, city);

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm ${t.cardBorder}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${t.cardHead}`}>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className={`flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-70 transition-opacity rounded ${t.focusRing}`}
        >
          <span className={`text-[9px] motion-safe:transition-transform motion-safe:duration-200 ${t.chevron} ${expanded ? "rotate-90" : ""}`}>▸</span>
          <p className={`text-[10px] font-bold uppercase tracking-wide truncate ${t.dayLabel}`}>
            {day.label}
          </p>
          {!expanded && (
            <span className={`hidden sm:inline text-[9px] font-medium shrink-0 ${t.dayCount}`}>
              {day.activities.length} activities
            </span>
          )}
        </button>
        {day.theme && (
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full min-w-0 max-w-[40%] truncate shrink ${t.themePill}`} title={day.theme}>
            {day.theme}
          </span>
        )}
        {routeInfo && (
          <span className="flex items-center gap-1 shrink-0">
            <a
              href={routeInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full transition-colors ${t.routeLink} ${t.focusRing}`}
              title="Open day route in Google Maps"
            >
              🗺️<span className="hidden sm:inline"> Route</span>
            </a>
            <CopyLinkButton url={routeInfo.url} t={t} />
          </span>
        )}
      </div>

      <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-4 py-3">
            <ul className="space-y-2">
              {day.activities.map((a, ai) => {
                const parsed = parseActivity(a);
                const letter = routeInfo?.labels.get(ai);
                return (
                  <li key={ai} className="flex gap-2.5 leading-snug group">
                    {letter ? (
                      <span className={`w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${t.marker}`}>{letter}</span>
                    ) : (
                      <span className={`shrink-0 mt-0.5 text-sm ${t.bullet}`}>›</span>
                    )}
                    <span className={`text-sm flex-1 ${t.actText}`}>
                      {parsed.name}
                      {parsed.cost && (
                        <span className="text-emerald-600 text-xs font-semibold ml-1.5">({parsed.cost})</span>
                      )}
                      {parsed.detail && (
                        <span className={`text-xs font-medium ml-1.5 ${t.actDetail}`}>{parsed.detail}</span>
                      )}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      <a href={mapsUrl(parsed.name, city)} target="_blank" rel="noopener noreferrer"
                        className={`text-[9px] px-1 ${t.actLink}`} title="View on Google Maps">📍</a>
                      <a href={searchUrl(parsed.name, city)} target="_blank" rel="noopener noreferrer"
                        className={`text-[9px] px-1 ${t.actLink}`} title="Search for booking/info">🔍</a>
                    </span>
                  </li>
                );
              })}
            </ul>

            {ruleDay && ruleDay.meals && ruleDay.meals.length > 0 && (
              <div className={`flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t ${t.divider}`}>
                <span className={`text-[10px] font-bold uppercase mr-1 ${t.eatLabel}`}>🍽 Eat:</span>
                {ruleDay.meals.map((m) => (
                  <a key={m} href={mapsUrl(m, city)} target="_blank" rel="noopener noreferrer"
                    className={`text-[10px] border px-2 py-0.5 rounded-full transition-colors ${t.eatPill}`}>
                    {m}
                  </a>
                ))}
              </div>
            )}

            {day.hotels && day.hotels.length > 0 && (
              <div className={`flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t ${t.divider}`}>
                {day.hotels.map((h) => {
                  const hotelName = h.split(" — ")[0];
                  return (
                    <a key={h} href={searchUrl(`${hotelName} hotel booking`, city)} target="_blank" rel="noopener noreferrer"
                      className={`text-[10px] border px-2 py-0.5 rounded-full transition-colors ${t.hotelPill}`}>
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

function CopyLinkButton({ url, t }: { url: string; t: ItinTheme }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={`text-[10px] font-semibold px-2 py-1 min-h-[24px] rounded-full transition-colors ${t.focusRing} ${
        copied ? t.copyDone : t.copyIdle
      }`}
      title={copied ? "Copied!" : "Copy route link"}
    >
      {copied ? "✓" : "📋"}
    </button>
  );
}
