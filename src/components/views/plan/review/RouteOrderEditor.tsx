import { useCallback, useEffect, useRef, useState } from "react";
import { getCountryFlag } from "@/utils/countryFlags";

export type RouteOrderStop = {
  name: string;
};

type Props = {
  /** Stops in current visit order. */
  stops: RouteOrderStop[];
  anchorName: string;
  onSetAnchor: (name: string) => void;
  /** Move the stop from one visit-order index to another. */
  onReorder: (from: number, to: number) => void;
  onAutoArrange: () => void;
  canAutoArrange: boolean;
  /** Scope-aware flag resolver (domestic stops read the home-country flag). */
  flagFor?: (name: string) => string;
};

/** Row index directly under the pointer, or null. Pure so it stays testable. */
function indexFromPoint(container: HTMLElement | null, x: number, y: number): number | null {
  if (!container) return null;
  const el = document.elementFromPoint(x, y);
  const row = el?.closest<HTMLElement>("[data-order-index]");
  if (!row || !container.contains(row)) return null;
  const idx = Number(row.dataset.orderIndex);
  return Number.isInteger(idx) ? idx : null;
}

/**
 * Accessible route reorder list for the multi-country levers bar. The mock's
 * "Anchor ✦ route order (drag)" spec calls for direct manipulation, so each stop
 * carries a ⠿ grip that reorders three ways — pointer drag (desktop mouse + mobile
 * touch, via pointer capture, with a live drop indicator), and keyboard Arrow
 * Up/Down on the focused grip — with no new dependencies. Reordering is delegated
 * to a pure `onReorder(from,to)` in the parent; focus is restored to the moved
 * stop's grip after a keyboard move so a screen-reader user can keep nudging it.
 */
export default function RouteOrderEditor({ stops, anchorName, onSetAnchor, onReorder, onAutoArrange, canAutoArrange, flagFor = getCountryFlag }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const gripRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [focusName, setFocusName] = useState<string | null>(null);

  // Restore focus to the moved grip after a keyboard reorder re-renders the list.
  useEffect(() => {
    if (!focusName) return;
    gripRefs.current[focusName]?.focus();
    setFocusName(null);
  }, [focusName, stops]);

  const keyboardMove = useCallback(
    (from: number, delta: -1 | 1, name: string) => {
      const to = from + delta;
      if (to < 0 || to >= stops.length) return;
      onReorder(from, to);
      setFocusName(name);
    },
    [stops.length, onReorder],
  );

  const handlePointerDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragIndex(i);
    setOverIndex(i);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragIndex === null) return;
    const idx = indexFromPoint(listRef.current, e.clientX, e.clientY);
    if (idx !== null) setOverIndex(idx);
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragIndex === null) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (overIndex !== null && overIndex !== dragIndex) onReorder(dragIndex, overIndex);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="min-w-[236px]">
      <ul ref={listRef} className="space-y-0.5">
        {stops.map((s, i) => {
          const isDragging = dragIndex === i;
          const isDropTarget = dragIndex !== null && overIndex === i && overIndex !== dragIndex;
          const isAnchor = s.name === anchorName;
          return (
            <li
              key={s.name}
              data-order-index={i}
              className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors ${
                isDragging
                  ? "bg-brand-50 opacity-60"
                  : isDropTarget
                    ? "bg-brand-50 ring-1 ring-brand-400"
                    : isAnchor
                      ? "bg-accent-50/60"
                      : "hover:bg-surface-2"
              }`}
            >
              <button
                type="button"
                ref={(el) => { gripRefs.current[s.name] = el; }}
                onPointerDown={handlePointerDown(i)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { e.preventDefault(); keyboardMove(i, -1, s.name); }
                  else if (e.key === "ArrowDown") { e.preventDefault(); keyboardMove(i, 1, s.name); }
                }}
                aria-label={`Reorder ${s.name}, position ${i + 1} of ${stops.length}. Use arrow up and down keys to move.`}
                className="focus-ring-emerald flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink-2 active:cursor-grabbing"
              >
                <span aria-hidden="true" className="text-[13px] leading-none">⠿</span>
              </button>
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-1 text-sm shadow-sm ring-1 ring-line"
              >
                {flagFor(s.name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-1">{s.name}</span>
              {isAnchor ? (
                <span className="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-1 text-[9px] font-bold uppercase text-accent-700 ring-1 ring-accent-200">
                  <span aria-hidden="true">★</span> Anchor
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetAnchor(s.name)}
                  aria-label={`Make ${s.name} the anchor`}
                  className="focus-ring-emerald flex min-h-[32px] items-center gap-1 rounded-full border border-line px-2 py-1 text-[9px] font-semibold text-ink-3 transition-colors hover:border-accent-400 hover:bg-accent-50 hover:text-accent-700"
                >
                  <span aria-hidden="true">☆</span> Anchor
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {canAutoArrange && (
        <button
          type="button"
          onClick={onAutoArrange}
          className="focus-ring-emerald mt-1.5 flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-100"
        >
          <span aria-hidden="true">✨</span> Auto-arrange from anchor
        </button>
      )}
    </div>
  );
}
