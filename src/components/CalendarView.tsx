import type { Country } from "../types";
import { MONTHS, expandMonth } from "../utils/months";

type CellType = "best" | "worst" | "neutral";

function cellType(country: Country, idx: number): CellType {
  const short = MONTHS[idx];
  const full = expandMonth(short);
  if (country.bestMonths.some((m) => m === full || m.startsWith(short))) return "best";
  if ((country.worstMonths ?? []).some((m) => m === full || m.startsWith(short))) return "worst";
  return "neutral";
}

type Props = {
  countries: Country[];
  onSelect: (c: Country) => void;
  visitedNames: Set<string>;
  selectedCountry: Country | null;
};

export default function CalendarView({ countries, onSelect, visitedNames, selectedCountry }: Props) {
  const nowIdx = new Date().getMonth();

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-5 px-5 py-2.5 border-b bg-white shrink-0">
        <span className="text-xs font-semibold text-gray-500">
          {countries.length} destination{countries.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-4 ml-auto text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-400 inline-block" /> Best time
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-red-200 inline-block" /> Avoid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-100 border-2 border-blue-400 inline-block" /> This month
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-[700px] text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-slate-100 text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[180px] border-b-2 border-gray-200 border-r">
                Destination
              </th>
              {MONTHS.map((m, i) => (
                <th
                  key={m}
                  className={`py-3 text-center text-xs font-bold border-b-2 border-gray-200 min-w-[52px] transition-colors ${
                    i === nowIdx
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-gray-500"
                  }`}
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-20 text-gray-400">
                  <p className="text-4xl mb-2">🗺️</p>
                  <p className="font-medium">No destinations match your filters</p>
                </td>
              </tr>
            ) : (
              countries.map((country, rowIdx) => {
                const isVisited = visitedNames.has(country.name);
                const isSelected = selectedCountry?.name === country.name;
                const rowBase = rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                return (
                  <tr
                    key={country.name}
                    onClick={() => onSelect(country)}
                    className={`cursor-pointer group ${isSelected ? "!bg-blue-50" : ""}`}
                  >
                    {/* Country name — sticky */}
                    <td
                      className={`sticky left-0 z-10 px-5 py-3 border-b border-r border-gray-100 ${
                        isSelected ? "bg-blue-50" : `${rowBase} group-hover:bg-slate-100`
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isVisited ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] flex items-center justify-center font-bold shrink-0">
                            ✓
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-[10px] flex items-center justify-center font-bold shrink-0">
                            {country.name[0]}
                          </span>
                        )}
                        <div>
                          <p className={`font-semibold leading-tight ${isVisited ? "text-emerald-800" : "text-gray-800"}`}>
                            {country.name}
                          </p>
                          <p className="text-[10px] text-gray-400 leading-tight">{country.budget}</p>
                        </div>
                      </div>
                    </td>

                    {/* Month cells */}
                    {MONTHS.map((m, i) => {
                      const type = cellType(country, i);
                      const isNow = i === nowIdx;
                      return (
                        <td
                          key={m}
                          className={[
                            "text-center py-3 border-b border-gray-100 font-bold text-base transition-colors",
                            type === "best"
                              ? "bg-emerald-100 text-emerald-600"
                              : type === "worst"
                              ? "bg-red-50 text-red-300"
                              : isNow
                              ? "bg-blue-50/40"
                              : "",
                            isNow ? "ring-1 ring-inset ring-blue-300" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {type === "best" ? "✦" : type === "worst" ? "·" : ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
