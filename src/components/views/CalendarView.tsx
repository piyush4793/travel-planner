import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { Country } from "../../core/types";
import { MONTHS, expandMonth } from "../../core/utils/months";
import { budgetForBasis, BUDGET_BASIS_META, type BudgetBasis } from "../../core/utils/budget";
import { useBreakpoint } from "../../hooks/useBreakpoint";

type CellType = "best" | "worst" | "neutral";

function cellType(country: Country, idx: number): CellType {
  const short = MONTHS[idx];
  const full = expandMonth(short);
  if (country.bestMonths.some((m) => m === full || m.startsWith(short))) return "best";
  if ((country.worstMonths ?? []).some((m) => m === full || m.startsWith(short))) return "worst";
  return "neutral";
}

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = {
  countries: Country[];
  onSelect: (c: Country) => void;
  visitedNames: Set<string>;
  selectedCountry: Country | null;
  budgetBasis: BudgetBasis;
};

export default function CalendarView({ countries, onSelect, visitedNames, selectedCountry, budgetBasis }: Props) {
  const nowIdx = new Date().getMonth();
  useBreakpoint(); // triggers re-render on breakpoint change for md: classes
  const [focusedRow, setFocusedRow] = useState(-1);
  const [search, setSearch] = useState("");
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const mobileFilterBtnRef = useRef<HTMLButtonElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [desktopColWidth, setDesktopColWidth] = useState(160);
  const [mobileColWidth, setMobileColWidth] = useState(120);

  // Close month popover on outside click (desktop only)
  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (mobileFilterBtnRef.current?.contains(target)) return;
      setFiltersOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [filtersOpen]);

  const toggleMonth = (m: string) =>
    setFilterMonths((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  const hasFilters = filterMonths.length > 0;
  const clearAll = () => { setSearch(""); setFilterMonths([]); };

  // Keyboard navigation for rows
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedRow(Math.min(rowIdx + 1, countries.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedRow(Math.max(rowIdx - 1, 0)); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(countries[rowIdx]); }
      else if (e.key === "Escape") { setFiltersOpen(false); }
    },
    [countries, onSelect],
  );

  // Auto-focus row when focusedRow changes via keyboard
  useEffect(() => {
    if (focusedRow < 0) return;
    const tbody = tbodyRef.current;
    if (!tbody) return;
    const row = tbody.children[focusedRow] as HTMLElement | undefined;
    if (row) {
      row.focus({ preventScroll: false });
      row.scrollIntoView?.({ block: "nearest" });
    }
  }, [focusedRow]);

  // Filter countries by search + selected months
  const filtered = useMemo(() => {
    let list = countries;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filterMonths.length > 0) {
      list = list.filter((c) =>
        filterMonths.some((m) => {
          const idx = MONTHS.indexOf(m as typeof MONTHS[number]);
          return idx >= 0 && cellType(c, idx) === "best";
        }),
      );
    }
    return list;
  }, [countries, search, filterMonths]);

  // Count best months for summary
  const bestNow = countries.filter((c) => cellType(c, nowIdx) === "best").length;

  /* Month grid filter — shared between mobile panel and desktop rail */
  const monthGrid = (
    <div>
      <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Month</p>
      <div className="grid grid-cols-4 gap-1">
        {MONTHS.map((m) => (
          <button
            key={m}
            onClick={() => toggleMonth(m)}
            className={`py-1.5 rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
              filterMonths.includes(m)
                ? "bg-blue-600 text-white"
                : m === MONTHS[nowIdx]
                ? "bg-blue-50 text-blue-600 border border-blue-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      {/* Screen reader live region for filter results */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Showing {filtered.length} of {countries.length} destinations
      </div>
      {/* ─── MOBILE HEADER ─── */}
      <div className="md:hidden border-b bg-white shrink-0 px-3 py-2 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              aria-label="Search destinations"
              className="w-full px-2 py-1.5 pl-8 pr-8 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors h-8"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-0.5 focus-ring rounded" title="Clear">
                ✕
              </button>
            )}
          </div>

          <button
            ref={mobileFilterBtnRef}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="cal-filters-mobile"
            aria-label="Month filter"
            className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs focus-ring ${
              filtersOpen || hasFilters
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "text-gray-500 border-gray-200 hover:bg-gray-100"
            }`}
            title="Month filter"
          >
            🎚️
          </button>
        </div>

        {filtersOpen && (
          <div id="cal-filters-mobile" role="region" aria-label="Month filters" className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Primary filters</p>
              {hasFilters && (
                <button onClick={() => setFilterMonths([])} className="text-[10px] font-semibold text-red-600 focus-ring rounded px-1">
                  Clear
                </button>
              )}
            </div>
            {monthGrid}
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400">
            Showing {filtered.length} of {countries.length} destinations
          </p>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /></span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200" /></span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border-2 border-blue-400 bg-blue-50" /></span>
          </div>
        </div>
      </div>

      {/* ─── DESKTOP/TABLET LAYOUT ─── */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {/* Compact toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200/80 bg-white shrink-0">
          {/* Search */}
          <div className="relative w-52">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search destinations…"
              aria-label="Search destinations"
              className="w-full px-2.5 py-1.5 pl-8 pr-7 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs focus-ring rounded" title="Clear">
                ✕
              </button>
            )}
          </div>

          {/* Months filter chip + popover */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-haspopup="true"
              aria-controls="cal-filters-desktop"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors focus-ring ${
                hasFilters
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Months{hasFilters && <span className="bg-blue-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">{filterMonths.length}</span>}
              <svg className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {filtersOpen && (
              <div id="cal-filters-desktop" role="region" aria-label="Select months" className="absolute top-full left-0 mt-1 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select months</p>
                  {hasFilters && (
                    <button onClick={() => setFilterMonths([])} className="text-[10px] font-semibold text-red-600 focus-ring rounded px-1">
                      Clear
                    </button>
                  )}
                </div>
                {monthGrid}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Count + Legend */}
          <p className="text-[10px] text-gray-400">
            {filtered.length} of {countries.length}
          </p>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-500 ml-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Best</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200" /> Avoid</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border-2 border-blue-400 bg-blue-50" /> Now</span>
          </div>

          {bestNow > 0 && filterMonths.length === 0 && !search && (
            <span className="text-[10px] font-semibold text-emerald-700 ml-2">
              🌟 {bestNow} perfect now
            </span>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <CalendarTable filtered={filtered} compact={false} nowIdx={nowIdx} selectedCountry={selectedCountry} focusedRow={focusedRow} visitedNames={visitedNames} filterMonths={filterMonths} budgetBasis={budgetBasis} onSelect={onSelect} handleKeyDown={handleKeyDown} setFocusedRow={setFocusedRow} tbodyRef={tbodyRef} colWidth={desktopColWidth} onColResize={setDesktopColWidth} onClearFilters={clearAll} />
        </div>
      </div>

      {/* ─── MOBILE TABLE ─── */}
      <div className="md:hidden flex-1 overflow-auto pb-safe">
        <CalendarTable filtered={filtered} compact={true} nowIdx={nowIdx} selectedCountry={selectedCountry} focusedRow={focusedRow} visitedNames={visitedNames} filterMonths={filterMonths} budgetBasis={budgetBasis} onSelect={onSelect} handleKeyDown={handleKeyDown} setFocusedRow={setFocusedRow} tbodyRef={tbodyRef} colWidth={mobileColWidth} onColResize={setMobileColWidth} onClearFilters={clearAll} />
      </div>
    </div>
  );
}

/* ── Table component (shared between mobile and desktop) ── */
function CalendarTable({
  filtered, compact, nowIdx, selectedCountry, focusedRow, visitedNames, filterMonths, budgetBasis, onSelect, handleKeyDown, setFocusedRow, tbodyRef, colWidth, onColResize, onClearFilters,
}: {
  filtered: Country[];
  compact: boolean;
  nowIdx: number;
  selectedCountry: Country | null;
  focusedRow: number;
  visitedNames: Set<string>;
  filterMonths: string[];
  budgetBasis: BudgetBasis;
  onSelect: (c: Country) => void;
  handleKeyDown: (e: React.KeyboardEvent, idx: number) => void;
  setFocusedRow: (idx: number) => void;
  tbodyRef: React.RefObject<HTMLTableSectionElement | null>;
  colWidth: number;
  onColResize: (w: number) => void;
  onClearFilters: () => void;
}) {
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - dragRef.current.startX;
      const minW = compact ? 80 : 120;
      const maxW = compact ? 200 : 280;
      onColResize(Math.max(minW, Math.min(maxW, dragRef.current.startW + delta)));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [compact, onColResize]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    dragRef.current = { startX: clientX, startW: colWidth };
  };
  return (
    <table className={`w-full border-collapse ${compact ? "" : "min-w-[700px]"}`} role="grid" aria-label="Travel calendar — best and worst months by destination">
      <thead className="sticky top-0 z-20">
        <tr>
          <th
            className={`relative sticky left-0 z-30 bg-gray-50 text-left font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 border-r border-r-gray-200 ${
              compact ? "px-2.5 py-2.5 text-[10px]" : "px-4 py-3 text-[10px]"
            }`}
            style={{ width: colWidth, maxWidth: colWidth, minWidth: compact ? 80 : 120 }}
          >
            <div className="flex items-center justify-between">
              <span>{compact ? "Place" : "Destination"}</span>
              {/* Resize handle */}
              <span
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-500/50 transition-colors"
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                aria-hidden="true"
              />
            </div>
          </th>
          {MONTHS.map((m, i) => (
            <th
              key={m}
              className={`text-center font-bold border-b border-gray-200 select-none ${
                compact ? "py-2 min-w-[32px] px-0.5 text-[10px]" : "py-3 min-w-[46px] text-[11px]"
              } ${
                filterMonths.includes(m)
                  ? "bg-blue-600 text-white"
                  : i === nowIdx
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-500"
              }`}
              title={MONTH_FULL[i]}
            >
              {m}
            </th>
          ))}
        </tr>
      </thead>
      <tbody ref={tbodyRef as React.LegacyRef<HTMLTableSectionElement>}>
        {filtered.length === 0 ? (
          <tr>
            <td colSpan={13} className="text-center py-24 text-gray-400">
              <p className="text-5xl mb-3">🗺️</p>
              <p className="font-semibold text-gray-500">No destinations match</p>
              <p className="text-xs mt-1 mb-3">Try adjusting your search or filters</p>
              <button
                onClick={onClearFilters}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors focus-ring"
              >
                Clear all filters
              </button>
            </td>
          </tr>
        ) : (
          filtered.map((country, rowIdx) => {
            const isVisited = visitedNames.has(country.name);
            const isSelected = selectedCountry?.name === country.name;
            const isFocused = focusedRow === rowIdx;
            const stripe = rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50";

            return (
              <tr
                key={country.name}
                tabIndex={0}
                role="row"
                aria-selected={isSelected}
                onClick={() => onSelect(country)}
                onKeyDown={(e) => handleKeyDown(e, rowIdx)}
                onFocus={() => setFocusedRow(rowIdx)}
                className={`cursor-pointer group transition-colors ${
                  isSelected
                    ? "!bg-blue-50 ring-1 ring-inset ring-blue-200"
                    : isFocused
                    ? "!bg-blue-50"
                    : ""
                } focus-ring`}
              >
                {/* Country name — sticky, fully opaque bg prevents color bleed */}
                <td
                  className={`sticky left-0 z-10 border-b border-r border-gray-100 ${
                    compact ? "px-2.5 py-2" : "px-4 py-2.5"
                  } ${
                    isSelected
                      ? "bg-blue-50"
                      : isFocused
                      ? "bg-blue-50"
                      : `${stripe} group-hover:bg-gray-100`
                  }`}
                  style={{ width: colWidth, maxWidth: colWidth, minWidth: compact ? 80 : 120 }}
                >
                  <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                    {!compact && (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isVisited
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {isVisited ? "✓" : country.name[0]}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p
                        className={`font-semibold leading-tight truncate ${
                          compact ? "text-[11px]" : "text-xs"
                        } ${isVisited ? "text-emerald-800" : "text-gray-800"}`}
                      >
                        {compact && isVisited && (
                          <span className="text-emerald-500 mr-0.5">✓ </span>
                        )}
                        {country.name}
                      </p>
                      {country.budget && (
                        <p className={`text-gray-400 leading-tight mt-0.5 truncate ${compact ? "text-[9px]" : "text-[10px]"}`}>
                          {budgetForBasis(country, budgetBasis)} {BUDGET_BASIS_META[budgetBasis].icon}
                        </p>
                      )}
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
                        `text-center border-b border-gray-100 transition-colors ${compact ? "py-2" : "py-2.5"}`,
                        type === "best"
                          ? "bg-emerald-100/80 text-emerald-500"
                          : type === "worst"
                          ? "bg-red-50/80 text-red-300"
                          : isNow
                          ? "bg-blue-50/30"
                          : "",
                        isNow ? "ring-1 ring-inset ring-blue-200/60" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={`${country.name} — ${MONTH_FULL[i]}: ${type === "best" ? "Best time" : type === "worst" ? "Avoid" : "Neutral"}`}
                    >
                      <span className={compact ? "text-xs" : "text-sm"}>
                        {type === "best" ? "●" : type === "worst" ? "✕" : ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
