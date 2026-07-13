import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { SheetGrip, SheetCloseButton } from "./sheetChrome";

type Pos = { left: number; width: number; top?: number; bottom?: number; maxH: number };

type Props = {
  /** Trigger contents (label/icon). */
  triggerLabel: ReactNode;
  triggerAriaLabel?: string;
  /** ARIA popup kind for the trigger. */
  haspopup?: "listbox" | "dialog" | "menu";
  /** Heading shown in the popover's branded header (desktop + mobile). */
  title: string;
  /** Small glyph shown in the header's icon tile (e.g. "🧭"). */
  icon?: ReactNode;
  /** One-line helper under the title (e.g. "Drag to reorder"). */
  subtitle?: string;
  triggerClassName?: string;
  /** Min popover width (desktop); the popover never exceeds the viewport. */
  minWidth?: number;
  /** Renders the popover body; call `close` to dismiss (e.g. after a choice). */
  children: (close: () => void) => ReactNode;
};

/**
 * Shared anchored popover for the Plan workspace levers/nav. Renders its own
 * trigger, then portals the body to `document.body` so it is never clipped by an
 * `overflow-hidden` ancestor: an edge-aware anchored popover on desktop/tablet
 * (flips up when there's no room below, clamped to the viewport) and a
 * bottom-sheet on mobile. Escape closes and restores focus to the trigger.
 */
export default function PlanPopover({
  triggerLabel,
  triggerAriaLabel,
  haspopup = "dialog",
  title,
  icon,
  subtitle,
  triggerClassName,
  minWidth = 240,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const close = useCallback(() => setOpen(false), []);

  const computePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;
    const flipUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxH = Math.max(160, (flipUp ? spaceAbove : spaceBelow) - 16);
    const width = Math.min(Math.max(minWidth, r.width), vw - 16);
    let left = r.left;
    if (left + width > vw - 8) left = vw - width - 8;
    if (left < 8) left = 8;
    setPos(flipUp ? { left, width, bottom: vh - r.top + 4, maxH } : { left, width, top: r.bottom + 4, maxH });
  }, [minWidth]);

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
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const header = (withClose: boolean) => (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-brand-100 bg-gradient-to-b from-brand-50 to-white px-4 py-3">
      {icon != null && (
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-base shadow-sm ring-1 ring-brand-100"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[15px] font-bold leading-tight tracking-tight text-brand-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] leading-tight text-brand-700/80">{subtitle}</p>}
      </div>
      {withClose && <SheetCloseButton onClick={close} />}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup={haspopup}
        aria-expanded={open}
        aria-label={triggerAriaLabel}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={close}
              className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeInUp_0.15s_ease-out]"
            />
            <div
              ref={popRef}
              className="relative flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl border-t border-brand-100 bg-surface-1 shadow-2xl safe-bottom motion-safe:animate-[slideUp_0.2s_ease-out]"
            >
              <SheetGrip />
              {header(true)}
              <div className="min-h-0 overflow-y-auto px-3 pb-8 pt-3">{children(close)}</div>
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
            className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-brand-100 bg-surface-1 shadow-xl ring-1 ring-brand-50 motion-safe:animate-[fadeInUp_0.15s_ease-out]"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          >
            {header(false)}
            <div className="min-h-0 overflow-y-auto p-1">{children(close)}</div>
          </div>,
          document.body,
        )}
    </>
  );
}
