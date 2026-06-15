import FilterChip from "./FilterChip";
import type { BudgetTier } from "../../core/utils/filterLogic";
import type { VisitedFilter } from "../../core/types";
import { MONTHS } from "../../core/utils/months";

const BUDGET_OPTIONS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "budget",  label: "₹ Budget",    desc: "under ₹1.5L" },
  { value: "mid",     label: "₹₹ Mid",      desc: "₹1.5L–₹3L"  },
  { value: "premium", label: "₹₹₹ Premium", desc: "₹3L+"        },
];

type Props = {
  selectedMonth: string[];
  setMonth: (m: string[]) => void;
  visitedFilter: VisitedFilter;
  setVisitedFilter: (v: VisitedFilter) => void;
  budgetFilter: BudgetTier;
  setBudgetFilter: (b: BudgetTier) => void;
};

export default function Filters({
  selectedMonth, setMonth,
  visitedFilter, setVisitedFilter,
  budgetFilter, setBudgetFilter,
}: Props) {
  function toggleMonth(m: string) {
    setMonth(selectedMonth.includes(m) ? selectedMonth.filter(x => x !== m) : [...selectedMonth, m]);
  }

  const monthLabel =
    selectedMonth.length === 0 ? "Month" :
    selectedMonth.length === 1 ? selectedMonth[0] :
    `Month (${selectedMonth.length})`;

  const budgetLabel =
    budgetFilter === "all" ? "Budget" :
    (BUDGET_OPTIONS.find(b => b.value === budgetFilter)?.label ?? "Budget");

  return (
    <div className="bg-white border-b border-gray-100 shrink-0 z-10 relative">
      <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 flex-wrap md:flex-nowrap md:overflow-x-auto scrollbar-hide">

        <FilterChip label={monthLabel} active={selectedMonth.length > 0}>
          {() => (
            <div className="p-3 w-52">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Month</p>
                {selectedMonth.length > 0 && (
                  <button onClick={() => setMonth([])} className="text-[10px] text-blue-500 font-semibold hover:text-blue-700">
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMonth(m)}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      selectedMonth.includes(m)
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </FilterChip>

        <FilterChip label={budgetLabel} active={budgetFilter !== "all"}>
          {(close) => (
            <div className="p-3 w-48">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Budget</p>
              <div className="space-y-1.5">
                {BUDGET_OPTIONS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => { setBudgetFilter(budgetFilter === value ? "all" : value); close(); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      budgetFilter === value
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] font-normal ${budgetFilter === value ? "opacity-75" : "text-gray-400"}`}>
                      {desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </FilterChip>

        <div className="w-px h-5 bg-gray-200 shrink-0 mx-0.5" />

        <select
          value={visitedFilter}
          onChange={(e) => setVisitedFilter(e.target.value as VisitedFilter)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors appearance-none cursor-pointer pr-6 bg-[length:12px] bg-[right_6px_center] bg-no-repeat ${
            visitedFilter !== "all"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")` }}
        >
          <option value="all">All Countries</option>
          <option value="unvisited">Not Visited</option>
          <option value="visited">✓ Visited</option>
        </select>
      </div>
    </div>
  );
}
