import { memo } from "react";
import type { CityEntry } from "../../../core/types";

type Variant = "default" | "luxury";

type Props = {
  city: CityEntry;
  /** When defined, the city is selectable (Plan tab) */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** Currently focused experiences — matching city tags are highlighted. */
  activeExperiences?: string[];
  /** Visual language. "luxury" = emerald/ivory guided-plan theme. */
  variant?: Variant;
};

/** Per-variant colour tokens for the selectable card, keyed by selection state. */
type SelectableTheme = {
  focusRing: string;
  card: (selected: boolean, matchesFocus: boolean) => string;
  title: (selected: boolean) => string;
  star: (selected: boolean) => string;
  check: (selected: boolean) => string;
  best: (selected: boolean) => string;
  worst: (selected: boolean) => string;
  exp: (selected: boolean, on: boolean) => string;
  notes: (selected: boolean) => string;
};

const THEMES: Record<Variant, SelectableTheme> = {
  default: {
    focusRing: "focus-ring",
    card: (selected, matchesFocus) =>
      selected
        ? "border-slate-700 bg-slate-800 text-white shadow-md"
        : matchesFocus
          ? "border-blue-300 bg-blue-50/60 text-gray-800 shadow-sm hover:border-blue-400 hover:shadow"
          : "border-gray-150 bg-white/80 text-gray-800 shadow-sm shadow-slate-100 hover:border-gray-300 hover:shadow",
    title: (selected) => (selected ? "text-white" : "text-gray-800"),
    star: (selected) => (selected ? "text-blue-200" : "text-blue-500"),
    check: (selected) =>
      selected ? "border-white bg-white text-slate-800" : "border-gray-300 text-transparent",
    best: (selected) =>
      selected ? "bg-white/20 text-emerald-100" : "bg-emerald-100 text-emerald-700",
    worst: (selected) => (selected ? "bg-white/20 text-rose-100" : "bg-rose-100 text-rose-700"),
    exp: (selected, on) =>
      selected
        ? on
          ? "bg-blue-400 text-white"
          : "bg-white/15 text-slate-300"
        : on
          ? "bg-blue-600 text-white"
          : "bg-blue-50 text-blue-700",
    notes: (selected) => (selected ? "text-slate-300" : "text-gray-500"),
  },
  luxury: {
    focusRing: "focus-ring-emerald",
    card: (selected, matchesFocus) =>
      selected
        ? "border-emerald-500 bg-emerald-50 text-ink-1 shadow-sm ring-1 ring-emerald-500/30"
        : matchesFocus
          ? "border-emerald-300 bg-emerald-50/70 text-[#1e2a25] shadow-sm hover:border-emerald-400 hover:shadow"
          : "border-line bg-white/85 text-[#1e2a25] shadow-[0_1px_2px_rgba(20,40,30,0.05)] hover:border-[#cfc9b8] hover:shadow",
    title: (selected) => (selected ? "text-emerald-900" : "text-ink-1"),
    star: () => "text-emerald-600",
    check: (selected) =>
      selected
        ? "border-emerald-600 bg-emerald-600 text-white"
        : "border-[#cfc9b8] text-transparent",
    best: () => "bg-emerald-100/80 text-emerald-800",
    worst: () => "bg-rose-50 text-rose-600",
    exp: (_selected, on) =>
      on ? "bg-emerald-700 text-white" : "bg-surface-3 text-emerald-800",
    notes: () => "text-ink-2",
  },
};

function CityCardInner({ city, selectable, selected, onToggle, activeExperiences, variant = "default" }: Props) {
  const bestMonths = city.bestMonths ?? [];
  const worstMonths = city.worstMonths ?? [];
  const experiences = city.experiences ?? [];
  const focus = activeExperiences ?? [];
  const matchesFocus = focus.length > 0 && experiences.some((e) => focus.includes(e));

  if (selectable) {
    const t = THEMES[variant];
    const on = !!selected;
    return (
      <button
        onClick={onToggle}
        className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-colors ${t.card(on, matchesFocus)} ${t.focusRing}`}
        aria-pressed={selected}
        aria-label={
          matchesFocus ? `${city.name} — matches your focus experiences` : city.name
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`flex min-w-0 flex-1 items-center gap-1 text-sm font-bold ${t.title(on)}`}>
            <span className="truncate">{city.name}</span>
            {matchesFocus && (
              <span
                className={`shrink-0 text-[10px] ${t.star(on)}`}
                aria-hidden="true"
                title="Matches your focus experiences"
              >
                ✦
              </span>
            )}
          </span>
          <span
            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] transition-colors ${t.check(on)}`}
          >
            ✓
          </span>
        </div>
        {(bestMonths.length > 0 || worstMonths.length > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {bestMonths.slice(0, 3).map((month) => (
              <span
                key={`b-${month}`}
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${t.best(on)}`}
              >
                {month.slice(0, 3)}
              </span>
            ))}
            {worstMonths.slice(0, 2).map((month) => (
              <span
                key={`w-${month}`}
                title={`Best avoided in ${month}`}
                aria-label={`Best avoided in ${month}`}
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${t.worst(on)}`}
              >
                <span aria-hidden="true">✕ </span>
                {month.slice(0, 3)}
              </span>
            ))}
          </div>
        )}
        {experiences.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {experiences.slice(0, 4).map((exp) => (
              <span
                key={exp}
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${t.exp(on, focus.includes(exp))}`}
              >
                {exp}
              </span>
            ))}
          </div>
        )}
        {city.notes && (
          <p className={`mt-1 text-[11px] leading-snug line-clamp-2 ${t.notes(on)}`}>
            {city.notes}
          </p>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white/80 px-3.5 py-2.5 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800">{city.name}</p>
        {bestMonths.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {bestMonths.slice(0, 3).map((month) => (
              <span key={month} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                {month.slice(0, 3)}
              </span>
            ))}
          </div>
        )}
      </div>
      {worstMonths.length > 0 && (
        <div className="mt-1 flex gap-1">
          {worstMonths.slice(0, 3).map((month) => (
            <span
              key={month}
              title={`Best avoided in ${month}`}
              aria-label={`Best avoided in ${month}`}
              className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700"
            >
              <span aria-hidden="true">✕ </span>
              {month.slice(0, 3)}
            </span>
          ))}
        </div>
      )}
      {city.notes && (
        <p className="mt-1 text-[11px] leading-snug text-gray-500 line-clamp-3">{city.notes}</p>
      )}
    </div>
  );
}

const CityCard = memo(CityCardInner);
export default CityCard;
