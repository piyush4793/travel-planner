export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

type MonthAbbrev = typeof MONTHS[number];

const FULL: Record<MonthAbbrev, string> = {
  Jan: "January",  Feb: "February", Mar: "March",     Apr: "April",
  May: "May",      Jun: "June",     Jul: "July",       Aug: "August",
  Sep: "September",Oct: "October",  Nov: "November",   Dec: "December",
};

export function expandMonth(abbrev: string): string {
  return FULL[abbrev as MonthAbbrev] ?? abbrev;
}

const ABBREV_BY_FULL: Record<string, MonthAbbrev> = Object.fromEntries(
  (Object.entries(FULL) as [MonthAbbrev, string][]).map(([abbrev, full]) => [full.toLowerCase(), abbrev]),
);

const INDEX_BY_ABBREV: Record<string, number> = Object.fromEntries(MONTHS.map((m, i) => [m, i]));

/** Full or abbreviated month name → 3-letter abbrev ("July"/"Jul" → "Jul"). */
export function abbrevMonth(month: string): string {
  const key = month.trim().toLowerCase();
  if (ABBREV_BY_FULL[key]) return ABBREV_BY_FULL[key];
  const cap = key.slice(0, 3);
  return MONTHS.find((m) => m.toLowerCase() === cap) ?? month;
}

function monthIndex(month: string): number {
  const idx = INDEX_BY_ABBREV[abbrevMonth(month)];
  return idx === undefined ? -1 : idx;
}

/**
 * Human-readable best-window from a set of month names (full or abbrev).
 * Collapses a single contiguous run — including a circular wrap like Nov→Mar —
 * into "Nov–Mar"; a near-complete year into "Year-round"; anything scattered
 * into a calendar-ordered abbrev list. Returns `null` for an empty set so
 * callers can omit the window entirely.
 */
export function formatMonthWindow(months: string[] | undefined): string | null {
  if (!months || months.length === 0) return null;
  const indices = [...new Set(months.map(monthIndex).filter((i) => i >= 0))].sort((a, b) => a - b);
  if (indices.length === 0) return null;
  if (indices.length >= 11) return "Year-round";

  const set = new Set(indices);
  const starts = indices.filter((m) => !set.has((m + 11) % 12));
  if (starts.length === 1) {
    const start = starts[0];
    const end = indices.filter((m) => !set.has((m + 1) % 12))[0];
    return start === end ? MONTHS[start] : `${MONTHS[start]}–${MONTHS[end]}`;
  }
  return indices.map((i) => MONTHS[i]).join(", ");
}
