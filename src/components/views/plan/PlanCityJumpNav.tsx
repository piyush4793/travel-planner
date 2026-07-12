import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TRANSPORT_EMOJI } from "../../../core/utils/transport";
import { getCountryFlag } from "../../../utils/countryFlags";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { SheetGrip } from "./sheetChrome";
import type { CityGroup } from "../../country/itinerary/ItineraryView";

/** One country's ordered cities. A single-country plan passes exactly one
 *  section; a multi-country route passes one per stop, in visit order. */
export type JumpSection = { country: string; cities: CityGroup[] };

type Props = {
  sections: JumpSection[];
  /** Jump handler — defaults to a plain scroll. The multi-country canvas passes
   *  a handler that first expands a collapsed stop, then scrolls to the city. */
  onJump?: (cityName: string) => void;
  /** Render only the compact dropdown trigger (no full-width `<nav>` band or
   *  desktop pill strip) so it can sit inline inside another toolbar row — e.g.
   *  beside "Route order" in the Route Canvas levers bar. */
  embedded?: boolean;
};

/** Hard cap on the dropdown height so it stays compact + scannable no matter how
 *  many cities the route has (a 20-city interrail must not span the viewport).
 *  Below this it fits content; above it, the list scrolls internally. */
const MAX_MENU_HEIGHT = 340;

function defaultJump(name: string) {
  document.getElementById(`city-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type PopoverPos = { left: number; width: number; top?: number; bottom?: number; maxH: number };

/**
 * "Jump to city" navigation for the guided plan itinerary. Short single-country
 * routes keep scannable wrapped pills on desktop; dense or multi-country routes
 * collapse to a country-grouped dropdown. The dropdown is rendered in a portal
 * (anchored popover on desktop/tablet, bottom-sheet on mobile) so it is never
 * clipped by the itinerary's `overflow-hidden` container.
 */
export default function PlanCityJumpNav({ sections, onJump, embedded = false }: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const jump = useCallback((name: string) => (onJump ?? defaultJump)(name), [onJump]);

  const allCities = sections.flatMap((s) => s.cities);
  const grouped = sections.length > 1;
  // Past a handful of cities the wrapped pill row gets cramped (multi-country
  // routes hit 8+), so collapse to the compact dropdown on every breakpoint.
  const manyStops = allCities.length > 5 || grouped;

  const computePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;
    const flipUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const avail = (flipUp ? spaceAbove : spaceBelow) - 16;
    const maxH = Math.max(160, Math.min(avail, MAX_MENU_HEIGHT));
    const width = Math.min(Math.max(220, r.width), vw - 16);
    let left = r.left;
    if (left + width > vw - 8) left = vw - width - 8;
    if (left < 8) left = 8;
    setPos(
      flipUp
        ? { left, width, bottom: vh - r.top + 4, maxH }
        : { left, width, top: r.bottom + 4, maxH },
    );
  }, []);

  useLayoutEffect(() => {
    if (!open || isMobile) return;
    computePos();
    const onScroll = () => computePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, isMobile, computePos]);

  useEffect(() => {
    if (!open) return;
    // Move focus into the list on open so the selected (or first) option is the
    // keyboard start point — arrow keys then rove immediately (listbox pattern).
    const raf = requestAnimationFrame(() => {
      const opts = popRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
      const selected = popRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
      (selected ?? opts?.[0])?.focus();
    });
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (allCities.length <= 1) return null;

  const select = (name: string) => {
    jump(name);
    setCurrent(name);
    setOpen(false);
  };

  const list = (
    <div
      role="listbox"
      aria-label="Jump to city"
      className="py-1"
      onKeyDown={(e) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
        const opts = Array.from(popRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
        if (opts.length === 0) return;
        e.preventDefault();
        const idx = opts.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "Home" ? 0
          : e.key === "End" ? opts.length - 1
          : e.key === "ArrowDown" ? (idx + 1 + opts.length) % opts.length
          : (idx - 1 + opts.length) % opts.length;
        opts[next]?.focus();
      }}
    >
      {sections.map((sec, si) => (
        <div
          key={sec.country}
          role="group"
          aria-label={sec.country}
          className={si > 0 ? "mt-1 border-t border-surface-3 pt-1" : ""}
        >
          {grouped && (
            <p className="sticky top-0 z-[1] flex items-center gap-2 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[11px] shadow-sm ring-1 ring-emerald-100"
              >
                {getCountryFlag(sec.country)}
              </span>
              <span className="truncate">{sec.country}</span>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                {sec.cities.length}
              </span>
            </p>
          )}
          {sec.cities.map((g) => (
            <button
              key={`${sec.country}-${g.name}`}
              type="button"
              role="option"
              aria-selected={current === g.name}
              onClick={() => select(g.name)}
              className="focus-ring-emerald flex min-h-[40px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-ink-1 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
            >
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 shrink-0 text-center opacity-70">
                  {g.transport ? TRANSPORT_EMOJI[g.transport.type] : "📍"}
                </span>
                {g.name}
              </span>
              <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-ink-3">{g.days.length}d</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={grouped ? "Jump to country / city…" : "Jump to city…"}
      className={`focus-ring-emerald flex min-h-[34px] min-w-0 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-[11px] font-semibold text-ink-1 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800${embedded ? " max-w-[8rem] shrink-0" : ""}`}
    >
      <span aria-hidden="true" className="shrink-0">📍</span>
      <span className={embedded ? "truncate" : undefined}>{current ?? (isMobile ? "Jump" : grouped ? "Jump to country / city…" : "Jump to city…")}</span>
      <span aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
    </button>
  );

  const portals = (
    <>
      {open &&
        isMobile &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Jump to city"
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeInUp_0.15s_ease-out]"
            />
            <div
              ref={popRef}
              className="relative flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl border-t border-line bg-white shadow-2xl safe-bottom motion-safe:animate-[slideUp_0.2s_ease-out]"
            >
              <SheetGrip className="pt-3" />
              <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-8">{list}</div>
            </div>
          </div>,
          document.body,
        )}

      {open &&
        !isMobile &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            className="fixed z-50 overflow-y-auto rounded-xl border border-line bg-white shadow-xl motion-safe:animate-[fadeInUp_0.15s_ease-out]"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          >
            {list}
          </div>,
          document.body,
        )}
    </>
  );

  // Inline in another toolbar row (Route Canvas levers bar): trigger only, no band.
  if (embedded) {
    return (
      <>
        {trigger}
        {portals}
      </>
    );
  }

  return (
    <nav aria-label="Jump to city" className="border-b border-line bg-white px-4 py-2">
      {/* Desktop pills — short single-country routes only. */}
      {!manyStops && (
        <div className="hidden flex-wrap items-center gap-x-1.5 gap-y-1.5 md:flex">
          {allCities.map((g, i) => (
            <span key={g.name} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => jump(g.name)}
                aria-label={`Jump to ${g.name}`}
                className="focus-ring-emerald rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-ink-1 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
              >
                {g.name}
              </button>
              {i < allCities.length - 1 &&
                (allCities[i + 1].transport ? (
                  <span
                    className="text-sm leading-none opacity-70"
                    title={allCities[i + 1].transport!.label}
                    aria-hidden="true"
                  >
                    {TRANSPORT_EMOJI[allCities[i + 1].transport!.type]}
                  </span>
                ) : (
                  <span className="text-[10px] text-line-strong" aria-hidden="true">→</span>
                ))}
            </span>
          ))}
        </div>
      )}

      {/* Trigger — always on mobile, and on desktop for dense/multi routes. */}
      <div className={manyStops ? "" : "md:hidden"}>{trigger}</div>

      {portals}
    </nav>
  );
}
