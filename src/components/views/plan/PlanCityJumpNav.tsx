import { useEffect, useRef, useState } from "react";
import { TRANSPORT_EMOJI } from "../../../core/utils/transport";
import type { CityGroup } from "../../country/itinerary/ItineraryView";

type Props = {
  groups: CityGroup[];
};

function jumpToCity(name: string) {
  document.getElementById(`city-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * "Jump to city" navigation for the guided plan itinerary. Mirrors the Itinerary
 * Modal: wrapped pills on desktop, a compact dropdown on mobile so the itinerary
 * keeps its vertical space. Luxury emerald/ivory themed to match the workspace.
 */
export default function PlanCityJumpNav({ groups }: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (groups.length <= 1) return null;

  const select = (name: string) => {
    jumpToCity(name);
    setCurrent(name);
    setOpen(false);
  };

  return (
    <nav aria-label="Jump to city" className="border-b border-[#e6e1d4] bg-white px-4 py-2.5">
      {/* Desktop: wrapped pills */}
      <div className="hidden flex-wrap items-center gap-x-1.5 gap-y-1.5 md:flex">
        {groups.map((g, i) => {
          const leg = i < groups.length - 1 ? groups[i + 1].transport : undefined;
          return (
            <span key={g.name} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => jumpToCity(g.name)}
                aria-label={`Jump to ${g.name}`}
                className="focus-ring-emerald rounded-full bg-[#f4f1e8] px-2.5 py-1 text-[10px] font-semibold text-[#1e2a25] transition-colors hover:bg-emerald-50 hover:text-emerald-800"
              >
                {g.name}
              </button>
              {i < groups.length - 1 &&
                (leg ? (
                  <span className="text-sm leading-none opacity-70" title={leg.label} aria-hidden="true">
                    {TRANSPORT_EMOJI[leg.type]}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#cfc9b8]" aria-hidden="true">→</span>
                ))}
            </span>
          );
        })}
      </div>

      {/* Mobile: compact dropdown */}
      <div ref={dropRef} className="relative md:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="focus-ring-emerald flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#f4f1e8] px-3 py-1.5 text-[11px] font-semibold text-[#1e2a25] transition-colors hover:bg-emerald-50 hover:text-emerald-800"
        >
          <span aria-hidden="true">📍</span>
          <span>{current ?? "Jump to city…"}</span>
          <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
        {open && (
          <div
            role="listbox"
            aria-label="Jump to city"
            className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-[#e4dece] bg-white py-1 shadow-xl motion-safe:animate-[fadeInUp_0.15s_ease-out]"
          >
            {groups.map((g) => (
              <button
                key={g.name}
                type="button"
                role="option"
                aria-selected={current === g.name}
                onClick={() => select(g.name)}
                className="focus-ring-emerald flex min-h-[40px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-[#1e2a25] transition-colors hover:bg-emerald-50 hover:text-emerald-800"
              >
                <span className="flex items-center gap-1.5">
                  {g.transport && (
                    <span aria-hidden="true" className="opacity-70">{TRANSPORT_EMOJI[g.transport.type]}</span>
                  )}
                  {g.name}
                </span>
                <span className="shrink-0 text-[9px] font-bold text-[#a8a293]">{g.days.length}d</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
