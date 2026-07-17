import { useState, useMemo, useRef, useEffect } from "react";
import type { TripPlan, DayEntry, ActivityDetail, ActivityPriority, HotelStay } from "../../../core/utils/tripPlans";
import { extractCityFromLabel } from "../../../core/utils/tripPlans";
import type { CountryRule } from "../../../core/data/itineraryRules";
import { type TransportType, TRANSPORT_EMOJI, detectTransport } from "../../../core/utils/transport";
import { intercityLinks, qualifyPlace } from "../../../core/utils/transitLinks";
import { buildRoute } from "../../../core/utils/googleMapsRoute";
import { parseNoteItems } from "../../../core/utils/practicalNotes";
import { useBreakpoint } from "../../../hooks/useBreakpoint";

// ─── Day grouping ─────────────────────────────────────────────────────────────

export type TransportMode = { mode: string; duration: string; cost: string; note?: string };

export type CityGroup = {
  name: string;
  days: DayEntry[];
  transport?: {
    type: TransportType;
    label: string;
    cost?: string;
    modes?: TransportMode[];
    skipped?: string;
  };
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
        g.transport = {
          type: detectTransport(conn.method),
          label: conn.method,
          cost: conn.cost,
          modes: conn.modes,
          skipped: conn.skipped,
        };
      }
    });
  }
  return groups;
}

// ─── Itinerary body (shared by the modal and the guided Plan tab) ─────────────

/** Colour tokens for the guided-plan luxury (emerald/ivory) skin. */
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
  sepModeRow: string;
};

const ITIN_THEME: ItinTheme = {
  focusRing: "focus-ring-emerald",
  sepBox: "bg-surface-3 border-line",
  sepTitle: "text-ink-1",
  sepSub: "text-ink-2",
  sepCost: "text-brand-800 bg-surface-1 border-line",
  cityTitle: "text-ink-1",
  cityBadge: "text-ink-2 bg-surface-track",
  cardBorder: "border-line",
  cardHead: "bg-brand-50 border-brand-100",
  chevron: "text-brand-700/60",
  dayLabel: "text-brand-800",
  dayCount: "text-brand-700/70",
  themePill: "text-brand-700 bg-brand-50",
  routeLink: "text-brand-700 bg-brand-50 hover:bg-brand-100",
  marker: "bg-brand-700 text-white",
  bullet: "text-line-strong",
  actText: "text-ink-1",
  actDetail: "text-ink-2",
  actLink: "text-brand-500 hover:text-brand-700",
  divider: "border-line",
  eatLabel: "text-ink-4",
  eatPill: "text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100",
  hotelPill: "text-ink-2 bg-surface-3 border-line hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700",
  noteBox: "bg-surface-3 border-line",
  noteLabel: "text-ink-4",
  noteText: "text-ink-2",
  noteItemLabel: "text-ink-2",
  noteItemText: "text-ink-body",
  copyIdle: "text-ink-4 bg-surface-3 hover:bg-surface-track hover:text-ink-2",
  copyDone: "text-brand-600 bg-brand-50",
  sepModeRow: "bg-surface-1 border-line",
};

interface ItineraryViewProps {
  plan: TripPlan;
  rule?: CountryRule | null;
  /** Country name — qualifies the intercity search links (e.g. "Bergen, Norway"). */
  country?: string;
}

/**
 * The reusable day-by-day itinerary body: transport separators, per-city
 * headers (with `city-<name>` scroll anchors), expandable day cards and the
 * parsed practical notes. Contains no modal chrome (header/close/warnings) so it
 * can be embedded in the modal's scroll body or the guided Plan tab's preview.
 */
export default function ItineraryView({ plan, rule, country }: ItineraryViewProps) {
  const groups = useMemo(() => groupDays(plan.days, rule), [plan.days, rule]);
  const t = ITIN_THEME;

  return (
    <>
      {groups.map((group, gi) => (
        <div key={group.name}>
          {/* Transport separator between cities */}
          {gi > 0 && (
            <TransportSeparator
              from={groups[gi - 1].name}
              to={group.name}
              transport={group.transport}
              country={country}
              t={t}
            />
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

// ─── Transport separator (inter-city, expandable mode comparison) ─────────────

const MODE_LABELS: Record<string, string> = {
  flight: "Flight", train: "Train", ferry: "Ferry", bus: "Bus", "cable-car": "Cable car", drive: "Car",
};

function modeEmoji(mode: string): string {
  return TRANSPORT_EMOJI[(mode as TransportType)] ?? "🚗";
}
function modeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode.charAt(0).toUpperCase() + mode.slice(1);
}

function TransportSeparator({
  from,
  to,
  transport,
  country,
  t,
}: {
  from: string;
  to: string;
  transport?: CityGroup["transport"];
  country?: string;
  t: ItinTheme;
}) {
  const [open, setOpen] = useState(false);
  const modes = transport?.modes ?? [];
  const hasCompare = modes.length > 0;
  // Live search links always available: curated fares/times go stale, so we hand
  // off to always-current tools (and this fills the gaps where a route has no
  // curated connection data at all). Endpoints qualified by country to disambiguate.
  const links = intercityLinks(qualifyPlace(from, country), qualifyPlace(to, country));
  const panelId = `leg-${from.replace(/\s+/g, "-")}-${to.replace(/\s+/g, "-")}`;
  const toggleLabel = hasCompare
    ? `Compare ${modes.length} way${modes.length !== 1 ? "s" : ""} to travel`
    : "Check live times & fares";

  return (
    <div className={`mx-4 md:mx-6 my-3 md:my-4 rounded-xl border ${t.sepBox}`}>
      <div className="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3">
        <span className="text-lg md:text-xl shrink-0" aria-hidden>
          {transport ? TRANSPORT_EMOJI[transport.type] : "→"}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${t.sepTitle}`}>
            {from} → {to}
          </p>
          {transport && <p className={`text-[11px] truncate ${t.sepSub}`}>{transport.label}</p>}
        </div>
        {transport?.cost && (
          <span className={`text-xs font-bold shrink-0 border px-2 py-0.5 rounded-full ${t.sepCost}`}>
            {transport.cost}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`w-full flex items-center justify-center gap-1 px-3 pb-2 text-[11px] font-semibold min-h-[32px] rounded-b-xl ${t.sepSub} ${t.focusRing}`}
      >
        {open ? "Hide options" : toggleLabel}
        <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div id={panelId} className="px-3 md:px-4 pb-3 space-y-1.5">
          {modes.map((m, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${t.sepModeRow}`}>
              <span className="text-sm shrink-0" aria-hidden>
                {modeEmoji(m.mode)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px]">
                  <span className={`font-bold ${t.sepTitle}`}>{modeLabel(m.mode)}</span>
                  <span className={t.sepSub}> · {m.duration}</span>
                </p>
                {m.note && <p className={`text-[10px] mt-0.5 ${t.sepSub}`}>{m.note}</p>}
              </div>
              <span className={`text-[11px] font-semibold shrink-0 ${t.sepTitle}`}>{m.cost}</span>
            </div>
          ))}
          {transport?.skipped && (
            <p className={`text-[10px] italic pt-0.5 ${t.sepSub}`}>Skipped: {transport.skipped}</p>
          )}
          {/* Always-current live options — no stale fares to maintain. */}
          <div className={hasCompare ? `pt-1.5 mt-1.5 border-t ${t.divider} space-y-1.5` : "space-y-1.5"}>
            {hasCompare && (
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.eatLabel}`}>
                Check live times & fares
              </p>
            )}
            {links.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${t.sepModeRow} ${t.focusRing}`}
              >
                <span aria-hidden>{l.icon}</span>
                <span className={`flex-1 font-semibold ${t.sepTitle}`}>{l.label}</span>
                <span className={`text-[10px] ${t.sepSub}`}>{l.hint}</span>
                <span aria-hidden className={t.dayLabel}>↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
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
    <div className={`border rounded-xl overflow-hidden shadow-sm bg-surface-1 ${t.cardBorder}`}>
      <div className={`flex flex-wrap sm:flex-nowrap items-center gap-2 px-4 py-2.5 border-b ${t.cardHead}`}>
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
        {(day.theme || routeInfo) && (
          <div className="flex w-full items-center gap-2 order-last sm:contents">
            {day.theme && (
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full min-w-0 max-w-[70%] truncate shrink sm:max-w-[40%] ${t.themePill}`} title={day.theme}>
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
        )}
        {day.pace && <PaceBadge pace={day.pace} />}
      </div>

      <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-4 py-3">
            {day.planNote && (
              <div className={`mb-3 px-3 py-2 rounded-lg border ${t.noteBox}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider mr-1.5 ${t.noteLabel}`}>Plan</span>
                <span className={`text-xs leading-relaxed ${t.noteText}`}>{day.planNote}</span>
              </div>
            )}
            {day.details && day.details.length > 0 ? (
              <PriorityActivities details={day.details} city={city} routeInfo={routeInfo} t={t} />
            ) : (
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
                        <span className="text-brand-600 text-xs font-semibold ml-1.5">({parsed.cost})</span>
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
            )}

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

            {day.stays && day.stays.length > 0 ? (
              <WhereToStay stays={day.stays} city={city} t={t} />
            ) : (
              day.hotels && day.hotels.length > 0 && (
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
              )
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
// ─── Pace badge ───────────────────────────────────────────────────────────────

/**
 * Day-tempo pill for the card header. Colour-blind safe — the word always shows;
 * the dot is a secondary cue only.
 */
const PACE_META: Record<string, { label: string; dot: string }> = {
  relaxed: { label: "Relaxed", dot: "bg-brand-500" },
  moderate: { label: "Moderate", dot: "bg-accent-500" },
  packed: { label: "Packed", dot: "bg-accent-600" },
};

function PaceBadge({ pace }: { pace: string }) {
  const meta = PACE_META[pace.toLowerCase()] ?? {
    label: pace.charAt(0).toUpperCase() + pace.slice(1),
    dot: "bg-ink-4",
  };
  return (
    <span
      className="ml-auto shrink-0 flex items-center gap-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-surface-1 border border-line text-ink-2"
      title={`Day pace: ${meta.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

// ─── Priority activities (rich, rule-backed days) ─────────────────────────────

const PRIORITY_LABEL: Record<ActivityPriority, string> = {
  "must-see": "Must-see",
  recommended: "Recommended",
  optional: "Optional",
};

function priorityDot(priority?: ActivityPriority) {
  if (priority === "must-see") return <span className="w-2 h-2 rounded-full bg-brand-600" aria-hidden="true" />;
  if (priority === "recommended") return <span className="w-2 h-2 rounded-full border-[1.5px] border-brand-600" aria-hidden="true" />;
  if (priority === "optional") return <span className="w-2 h-2 rounded-full bg-ink-4" aria-hidden="true" />;
  return <span className="text-sm leading-none text-line-strong" aria-hidden="true">›</span>;
}

function PriorityActivities({
  details, city, routeInfo, t,
}: {
  details: ActivityDetail[];
  city: string;
  routeInfo: ReturnType<typeof buildRoute> | null;
  t: ItinTheme;
}) {
  const tipInline = useBreakpoint() !== "mobile";
  return (
    <ul className="space-y-2.5">
      {details.map((act, ai) => (
        <ActivityRow key={ai} act={act} city={city} letter={routeInfo?.labels.get(ai)} tipInline={tipInline} t={t} />
      ))}
    </ul>
  );
}

function ActivityRow({
  act, city, letter, tipInline, t,
}: {
  act: ActivityDetail;
  city: string;
  letter?: string;
  tipInline: boolean;
  t: ItinTheme;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const dash = act.name.indexOf(" — ");
  const name = dash > 0 ? act.name.slice(0, dash) : act.name;
  const desc = dash > 0 ? act.name.slice(dash + 3) : "";
  const meta = [act.duration, act.priority ? PRIORITY_LABEL[act.priority] : ""].filter(Boolean).join(" · ");

  return (
    <li className="flex gap-2.5 leading-snug group">
      {letter ? (
        <span className={`w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${t.marker}`}>{letter}</span>
      ) : (
        <span className="shrink-0 flex items-center justify-center w-3.5 h-3.5 mt-1">{priorityDot(act.priority)}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className="text-sm flex-1 min-w-0">
            <span className={`font-semibold ${t.actText}`}>{name}</span>
            {desc && <span className={`text-xs font-medium ml-1 ${t.actDetail}`}>— {desc}</span>}
          </span>
          {act.cost && (
            <span className="text-xs font-semibold text-brand-700 shrink-0 text-right max-w-[38%]">{act.cost}</span>
          )}
        </div>
        {meta && <p className={`text-[11px] mt-0.5 ${t.actDetail}`}>⏱ {meta}</p>}
        {act.tip && tipInline && (
          <p className={`text-[11px] italic mt-0.5 ${t.actDetail}`}>💡 {act.tip}</p>
        )}
        {act.tip && !tipInline && (
          <>
            <button
              type="button"
              onClick={() => setTipOpen((o) => !o)}
              aria-expanded={tipOpen}
              className={`mt-1 text-[11px] font-medium min-h-[24px] rounded ${t.actLink} ${t.focusRing}`}
            >
              💡 {tipOpen ? "Hide tip" : "Tap for tip"}
            </button>
            {tipOpen && <p className={`text-[11px] italic mt-0.5 ${t.actDetail}`}>{act.tip}</p>}
          </>
        )}
      </div>
      <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        <a href={mapsUrl(name, city)} target="_blank" rel="noopener noreferrer"
          className={`text-[9px] px-1 ${t.actLink} ${t.focusRing}`} title="View on Google Maps">📍</a>
        <a href={searchUrl(name, city)} target="_blank" rel="noopener noreferrer"
          className={`text-[9px] px-1 ${t.actLink} ${t.focusRing}`} title="Search for booking/info">🔍</a>
      </span>
    </li>
  );
}

// ─── Where to stay (tiered, segmented) ────────────────────────────────────────

const TIER_ORDER = ["budget", "mid", "premium"] as const;
const TIER_LABEL: Record<(typeof TIER_ORDER)[number], string> = {
  budget: "Budget",
  mid: "Mid",
  premium: "Premium",
};

function WhereToStay({ stays, city, t }: { stays: HotelStay[]; city: string; t: ItinTheme }) {
  const tiers = useMemo(() => TIER_ORDER.filter((tier) => stays.some((s) => s.tier === tier)), [stays]);
  const [active, setActive] = useState<(typeof TIER_ORDER)[number] | null>(tiers[0] ?? null);
  const list = active ? stays.filter((s) => s.tier === active) : stays;

  return (
    <div className={`mt-3 pt-2.5 border-t ${t.divider}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${t.noteLabel}`}>Where to stay</p>
      {tiers.length > 0 && (
        <div role="tablist" aria-label="Hotel price tiers" className="inline-flex rounded-full bg-surface-3 border border-line p-0.5 mb-2.5">
          {tiers.map((tier) => (
            <button
              key={tier}
              type="button"
              role="tab"
              aria-selected={active === tier}
              onClick={() => setActive(tier)}
              className={`text-[11px] font-semibold px-3 py-1 min-h-[28px] rounded-full transition-colors ${t.focusRing} ${
                active === tier ? "bg-brand-700 text-white" : "text-ink-2 hover:text-ink-1"
              }`}
            >
              {TIER_LABEL[tier]}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-1.5">
        {list.map((s) => (
          <li key={s.name} className="flex items-baseline justify-between gap-3">
            <a
              href={searchUrl(`${s.name} hotel booking`, city)}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs font-medium ${t.actText} hover:text-brand-700 hover:underline rounded ${t.focusRing}`}
            >
              {s.name}
            </a>
            <span className={`text-[11px] shrink-0 ${t.actDetail}`}>{s.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
