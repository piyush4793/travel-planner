import { useMemo, useState } from "react";
import type { CatalogEntry } from "../types";
import PillGroup from "./PillGroup";

type Props = {
  catalog: CatalogEntry[];
  myListNames: Set<string>;
  onAddToList: (name: string) => void;
  onRemoveFromList: (name: string) => void;
};

const REGIONS = ["All", "Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];
type ListFilter = "all" | "in-list" | "not-in-list";

export default function DiscoverView({ catalog, myListNames, onAddToList, onRemoveFromList }: Props) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [listFilter, setListFilter] = useState<ListFilter>("in-list");

  const filtered = useMemo(() => {
    let result = catalog;
    if (region !== "All") result = result.filter((c) => c.region === region);
    if (listFilter === "in-list") result = result.filter((c) => myListNames.has(c.name));
    if (listFilter === "not-in-list") result = result.filter((c) => !myListNames.has(c.name));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    // Listed countries sort to top when showing "all"
    return [...result].sort((a, b) => {
      const aIn = myListNames.has(a.name) ? 0 : 1;
      const bIn = myListNames.has(b.name) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return a.name.localeCompare(b.name);
    });
  }, [catalog, region, listFilter, search, myListNames]);

  const inListCount = catalog.filter((c) => myListNames.has(c.name)).length;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Summary */}
      <div className="flex items-center gap-5 px-5 py-2.5 border-b bg-gradient-to-r from-slate-50 to-white shrink-0">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-blue-600">{catalog.length}</span>
            <span className="text-[11px] text-gray-400 font-medium">countries worldwide</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-emerald-600">{inListCount}</span>
            <span className="text-[11px] text-gray-400 font-medium">in your list</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-gray-400">{catalog.length - inListCount}</span>
            <span className="text-[11px] text-gray-400 font-medium">to discover</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-5 py-2 border-b bg-white shrink-0 overflow-x-auto">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries…"
          className="w-52 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors"
        />

        <div className="h-5 w-px bg-gray-200 shrink-0" />

        <PillGroup
          options={REGIONS.map((r) => ({ key: r, label: r === "All" ? "🌍 All" : r }))}
          value={region}
          onChange={setRegion}
        />

        <div className="h-5 w-px bg-gray-200 shrink-0" />

        <PillGroup
          options={[
            { key: "all", label: "Any" },
            { key: "in-list", label: "In My List" },
            { key: "not-in-list", label: "Not Added" },
          ]}
          value={listFilter}
          onChange={(v) => setListFilter(v as ListFilter)}
        />

        {(search || region !== "All" || listFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setRegion("All"); setListFilter("all"); }}
            className="shrink-0 text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Country grid */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[10px] text-gray-400 mb-3 max-w-5xl mx-auto">
          Showing {filtered.length} of {catalog.length} countries
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-w-5xl mx-auto">
          {filtered.map((entry) => {
            const inList = myListNames.has(entry.name);
            return (
              <div
                key={entry.name}
                className={`rounded-xl border p-3 transition-all ${
                  inList
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-gray-800 leading-tight">{entry.name}</span>
                  {inList && <span className="text-emerald-500 text-[10px] shrink-0">✓</span>}
                </div>
                <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded inline-block mb-2">
                  {entry.region}
                </span>
                <div>
                  {inList ? (
                    <button
                      onClick={() => onRemoveFromList(entry.name)}
                      className="w-full text-[10px] font-medium text-red-500 hover:text-red-700 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove from list
                    </button>
                  ) : (
                    <button
                      onClick={() => onAddToList(entry.name)}
                      className="w-full text-[10px] font-semibold text-blue-600 hover:text-blue-700 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      + Add to My List
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400 text-sm">
              No countries match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
