import { useState, useEffect, useRef } from "react";

const HOME_COUNTRIES = [
  "India", "United States", "United Kingdom", "Germany", "France",
  "Australia", "Canada", "Singapore", "UAE", "Japan", "South Korea",
  "Netherlands", "Italy", "Spain", "Brazil", "South Africa",
];

type Props = { value: string; onChange: (v: string) => void };

export default function HomeCountrySelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold transition-colors border border-white/20 text-white"
      >
        📍 {value}
        <span className={`text-white/60 text-[10px] transition-transform inline-block ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1 min-w-44 max-h-60 overflow-y-auto">
          {HOME_COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                c === value ? "text-blue-600 font-bold bg-blue-50" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c === value ? "✓ " : "  "}{c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
