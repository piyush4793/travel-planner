import { useState, useMemo } from "react";
import type { Country } from "../types";
import { getBudgetTier } from "../utils/filterLogic";

const PAGE_SIZE = 10;
type SortKey = "name" | "budget" | "visited";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey === col) return <span className="ml-1 text-blue-500">{sortDir === "asc" ? "↑" : "↓"}</span>;
  return <span className="ml-1 text-gray-300 group-hover:text-gray-400">↕</span>;
}

const BUDGET_ORDER = { budget: 1, mid: 2, premium: 3 };

type Props = {
  countries: Country[];
  visitedNames: Set<string>;
  favorites: Set<string>;
  onToggleVisited: (name: string) => void;
  onToggleFavorite: (name: string) => void;
  onEdit: (c: Country) => void;
  onDelete: (c: Country) => void;
  onSelect: (c: Country) => void;
  selectedCountry: Country | null;
};

export default function ListView({
  countries,
  visitedNames, favorites,
  onToggleVisited, onToggleFavorite,
  onEdit, onDelete, onSelect,
  selectedCountry,
}: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  const sorted = useMemo(() => {
    const q = search.toLowerCase();
    const base = countries.filter((c) => c.name.toLowerCase().includes(q));
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "budget")
        cmp = BUDGET_ORDER[getBudgetTier(a.budget)] - BUDGET_ORDER[getBudgetTier(b.budget)];
      else if (sortKey === "visited")
        cmp = Number(visitedNames.has(b.name)) - Number(visitedNames.has(a.name));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [countries, search, sortKey, sortDir, visitedNames]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search countries…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-auto">
          {sorted.length} destination{sorted.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm min-w-[800px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b-2 border-gray-200">
              <th className="w-10 py-3 px-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">★</th>
              <th
                onClick={() => handleSort("name")}
                className="group text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                Country <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                onClick={() => handleSort("budget")}
                className="group text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                Budget <SortIcon col="budget" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Best Months
              </th>
              <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Experiences
              </th>
              <th
                onClick={() => handleSort("visited")}
                className="group text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none w-24"
              >
                Visited <SortIcon col="visited" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="font-medium">No countries match your search</p>
                </td>
              </tr>
            ) : (
              pageRows.map((country, idx) => {
                const isVisited = visitedNames.has(country.name);
                const isFav = favorites.has(country.name);
                const isSelected = selectedCountry?.name === country.name;
                const tier = getBudgetTier(country.budget);

                return (
                  <tr
                    key={country.name}
                    onClick={() => onSelect(country)}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? "bg-blue-50"
                        : idx % 2 === 0
                        ? "bg-white hover:bg-slate-50"
                        : "bg-slate-50/40 hover:bg-slate-100/70"
                    }`}
                  >
                    {/* Favorite */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(country.name)}
                        className={`text-lg leading-none transition-colors ${isFav ? "text-yellow-400" : "text-gray-200 hover:text-yellow-300"}`}
                        title={isFav ? "Remove favorite" : "Add favorite"}
                      >
                        {isFav ? "★" : "☆"}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{country.name}</span>
                        {isVisited && (
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[9px] flex items-center justify-center font-black shrink-0">✓</span>
                        )}
                      </div>
                      {country.combo && country.combo.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">+ {country.combo.slice(0, 2).join(", ")}</p>
                      )}
                    </td>

                    {/* Budget */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          tier === "budget" ? "bg-green-400" :
                          tier === "mid" ? "bg-amber-400" : "bg-red-400"
                        }`} />
                        <span className="text-gray-700 text-xs font-medium">{country.budget}</span>
                      </div>
                    </td>

                    {/* Best months */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {country.bestMonths.slice(0, 4).map((m) => (
                          <span key={m} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded">
                            {m.slice(0, 3)}
                          </span>
                        ))}
                        {country.bestMonths.length > 4 && (
                          <span className="text-[10px] text-gray-400">+{country.bestMonths.length - 4}</span>
                        )}
                      </div>
                    </td>

                    {/* Experiences */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {country.experiences.slice(0, 3).map((e) => (
                          <span key={e} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded">
                            {e}
                          </span>
                        ))}
                        {country.experiences.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{country.experiences.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Visited toggle */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleVisited(country.name)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all font-bold text-sm ${
                          isVisited
                            ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 ring-1 ring-emerald-300"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                        title={isVisited ? "Mark unvisited" : "Mark visited"}
                      >
                        {isVisited ? "✓" : "○"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEdit(country)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(country)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50 shrink-0">
          <span className="text-xs text-gray-500 font-medium">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <PageBtn onClick={() => setPage(1)} disabled={safePage === 1} label="«" />
            <PageBtn onClick={() => setPage((p) => p - 1)} disabled={safePage === 1} label="‹" />
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                ) : (
                  <PageBtn key={p} onClick={() => setPage(p as number)} active={safePage === p} label={String(p)} />
                )
              )}
            <PageBtn onClick={() => setPage((p) => p + 1)} disabled={safePage === totalPages} label="›" />
            <PageBtn onClick={() => setPage(totalPages)} disabled={safePage === totalPages} label="»" />
          </div>
        </div>
      )}

      {/* Summary footer when pagination not needed */}
      {totalPages === 1 && sorted.length > 0 && (
        <div className="px-5 py-2.5 border-t bg-slate-50 shrink-0">
          <span className="text-xs text-gray-400 font-medium">
            {sorted.length} destination{sorted.length !== 1 ? "s" : ""} ·{" "}
            {[...visitedNames].filter((n) => countries.find((c) => c.name === n)).length} visited ·{" "}
            {[...favorites].filter((n) => countries.find((c) => c.name === n)).length} saved
          </span>
        </div>
      )}
    </div>
  );
}

function PageBtn({
  onClick, disabled, label, active,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-semibold transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : disabled
          ? "text-gray-300 cursor-not-allowed"
          : "text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
