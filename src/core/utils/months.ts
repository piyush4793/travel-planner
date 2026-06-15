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
