import { useState, useEffect, useRef, useMemo } from "react";
import catalogData from "../../../data/worldCatalog.json";
import type { CatalogEntry } from "../../core/types";
import { isEnabled } from "../../core/featureFlags";

const CATALOG = catalogData as CatalogEntry[];
const MAX_VISIBLE = 10;

type Props = { value: string; onChange: (v: string) => void };

export default function HomeCountrySelector({ value, onChange }: Props) {
  const searchable = isEnabled("searchableHomeCountry");

  if (searchable) {
    return <SearchableSelector value={value} onChange={onChange} />;
  }
  return (
    <span
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-white/10 rounded-full border border-white/15"
      title="Home country"
    >
      📍 {value}
    </span>
  );
}

function SearchableSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allCountries = useMemo(
    () => CATALOG.map((c) => c.name).sort(),
    [],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allCountries;
    const q = search.toLowerCase();
    return allCountries.filter((n) => n.toLowerCase().includes(q));
  }, [allCountries, search]);

  const visible = filtered.slice(0, MAX_VISIBLE);
  const hasMore = filtered.length > MAX_VISIBLE;

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <TriggerButton value={value} open={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 min-w-52 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries…"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {visible.map((c) => (
              <CountryOption
                key={c}
                name={c}
                selected={c === value}
                onClick={() => { onChange(c); setOpen(false); setSearch(""); }}
              />
            ))}
            {hasMore && (
              <div className="px-3 py-1.5 text-[10px] text-gray-400 text-center">
                {filtered.length - MAX_VISIBLE} more — type to narrow
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                No countries match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TriggerButton({ value, open, onClick }: { value: string; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold transition-colors border border-white/20 text-white"
    >
      📍 {value}
      <span className={`text-white/60 text-[10px] transition-transform inline-block ${open ? "rotate-180" : ""}`}>▾</span>
    </button>
  );
}

function CountryOption({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
        selected ? "text-blue-600 font-bold bg-blue-50" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {selected ? "✓ " : "  "}{name}
    </button>
  );
}
