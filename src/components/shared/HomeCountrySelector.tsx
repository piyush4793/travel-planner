import { useState, useEffect, useRef, useMemo } from "react";
import catalogData from "../../../data/worldCatalog.json";
import type { CatalogEntry } from "../../core/types";
import { isEnabled } from "../../core/featureFlags";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useBackDismiss } from "../../hooks/useBackDismiss";

const CATALOG = catalogData as CatalogEntry[];
const MAX_VISIBLE = 10;

type Variant = "header" | "light";
type Props = { value: string; onChange: (v: string) => void; variant?: Variant };

export default function HomeCountrySelector({ value, onChange, variant = "header" }: Props) {
  const searchable = isEnabled("searchableHomeCountry");

  if (searchable) {
    return <SearchableSelector value={value} onChange={onChange} variant={variant} />;
  }
  const staticClass = variant === "light"
    ? "flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg border border-slate-200"
    : "flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-white/10 rounded-full border border-white/15";
  return (
    <span
      className={staticClass}
      aria-label={`Home country: ${value}`}
    >
      📍 {value}
    </span>
  );
}

function SearchableSelector({ value, onChange, variant = "header" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = "home-country-listbox";
  const isMobile = useBreakpoint() === "mobile";

  // On mobile, let the device Back button close the dropdown first.
  useBackDismiss(open && isMobile, () => setOpen(false));

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
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setActiveIndex(-1);
    }
  }, [open]);

  // Reset active index when filtered list changes
  useEffect(() => { setActiveIndex(-1); }, [filtered.length]);

  const selectCountry = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, visible.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < visible.length) {
          selectCountry(visible[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const option = listRef.current.children[activeIndex] as HTMLElement | undefined;
    option?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <TriggerButton value={value} open={open} variant={variant} onClick={() => setOpen((o) => !o)} />
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
              role="combobox"
              aria-expanded={true}
              aria-controls={listId}
              aria-activedescendant={activeIndex >= 0 ? `hc-opt-${activeIndex}` : undefined}
              aria-autocomplete="list"
            />
          </div>
          <div ref={listRef} className="max-h-[280px] overflow-y-auto py-1" role="listbox" id={listId}>
            {visible.map((c, i) => (
              <CountryOption
                key={c}
                id={`hc-opt-${i}`}
                name={c}
                selected={c === value}
                active={i === activeIndex}
                onClick={() => selectCountry(c)}
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

function TriggerButton({ value, open, variant = "header", onClick }: { value: string; open: boolean; variant?: Variant; onClick: () => void }) {
  const cls = variant === "light"
    ? "flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-200 text-slate-700 focus-ring"
    : "flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold transition-colors border border-white/20 text-white focus-ring";
  const chevronCls = variant === "light" ? "text-slate-400" : "text-white/60";
  return (
    <button
      onClick={onClick}
      className={cls}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={`Home country: ${value}`}
    >
      📍 {value}
      <span className={`${chevronCls} text-[10px] transition-transform inline-block ${open ? "rotate-180" : ""}`}>▾</span>
    </button>
  );
}

function CountryOption({ id, name, selected, active, onClick }: { id: string; name: string; selected: boolean; active: boolean; onClick: () => void }) {
  return (
    <button
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 min-h-[36px] text-xs transition-colors focus-ring ${
        active ? "bg-blue-50 text-blue-700" :
        selected ? "text-blue-600 font-bold bg-blue-50/50" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {selected ? "✓ " : "  "}{name}
    </button>
  );
}
