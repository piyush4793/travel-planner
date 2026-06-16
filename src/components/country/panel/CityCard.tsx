import { memo } from "react";
import type { CityEntry } from "../../../core/types";

type Props = {
  city: CityEntry;
  /** When defined, the city is selectable (Plan tab) */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
};

function CityCardInner({ city, selectable, selected, onToggle }: Props) {
  const bestMonths = city.bestMonths ?? [];

  if (selectable) {
    return (
      <button
        onClick={onToggle}
        className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-colors ${
          selected
            ? "border-slate-700 bg-slate-800 text-white shadow-md"
            : "border-gray-150 bg-white/80 text-gray-800 shadow-sm shadow-slate-100 hover:border-gray-300 hover:shadow"
        } focus-ring`}
        aria-pressed={selected}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-bold ${selected ? "text-white" : "text-gray-800"}`}>
            {city.name}
          </span>
          <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] transition-colors ${
            selected
              ? "border-white bg-white text-slate-800"
              : "border-gray-300 text-transparent"
          }`}>
            ✓
          </span>
        </div>
        {city.notes && (
          <p className={`mt-1 text-[11px] leading-snug line-clamp-2 ${
            selected ? "text-slate-300" : "text-gray-500"
          }`}>
            {city.notes}
          </p>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white/80 px-3.5 py-2.5 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-800">{city.name}</p>
        {bestMonths.length > 0 && (
          <div className="flex gap-1">
            {bestMonths.slice(0, 3).map((month) => (
              <span key={month} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                {month.slice(0, 3)}
              </span>
            ))}
          </div>
        )}
      </div>
      {city.notes && (
        <p className="mt-1 text-[11px] leading-snug text-gray-500 line-clamp-3">{city.notes}</p>
      )}
    </div>
  );
}

const CityCard = memo(CityCardInner);
export default CityCard;
