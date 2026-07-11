import { useCallback, useEffect, useRef, useState } from "react";
import { getCountryFlag } from "../../../utils/countryFlags";

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
export default function RouteOrderEditor({ stops, anchorName, onSetAnchor, onReorder, onAutoArrange, canAutoArrange }: Props) {
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
    <div className="min-w-[236px] p-1">
      <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-[#a8a293]">Route order</p>
      <ul ref={listRef} className="space-y-0.5">
        {stops.map((s, i) => {
          const isDragging = dragIndex === i;
          const isDropTarget = dragIndex !== null && overIndex === i && overIndex !== dragIndex;
          return (
            <li
              key={s.name}
              data-order-index={i}
              className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors ${
                isDragging ? "bg-emerald-50 opacity-60" : isDropTarget ? "bg-emerald-50 ring-1 ring-emerald-400" : ""
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
                className="focus-ring-emerald flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-[#b3ad9d] transition-colors hover:bg-[#efeadd] hover:text-[#6f6a5d] active:cursor-grabbing"
              >
                <span aria-hidden="true" className="text-[13px] leading-none">⠿</span>
              </button>
              <span aria-hidden="true">{getCountryFlag(s.name)}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#1e2a25]">{s.name}</span>
              {s.name === anchorName ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                  <span aria-hidden="true">★</span> Anchor
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetAnchor(s.name)}
                  aria-label={`Make ${s.name} the anchor`}
                  className="focus-ring-emerald flex min-h-[28px] items-center gap-1 rounded-full border border-[#e0dacb] px-1.5 py-0.5 text-[9px] font-semibold text-[#8a8577] transition-colors hover:border-amber-400 hover:text-amber-700"
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
          className="focus-ring-emerald mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-[#d8d2c2] bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-800 transition-colors hover:border-emerald-500 hover:bg-emerald-50"
        >
          <span aria-hidden="true">✨</span> Auto-arrange from anchor
        </button>
      )}
    </div>
  );
}
