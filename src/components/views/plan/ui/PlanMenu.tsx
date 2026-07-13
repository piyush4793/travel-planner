import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { SheetGrip, SheetCloseButton } from "./sheetChrome";

type Props = {
  /** Trigger button content (label / flag / caret handled by caller). */
  trigger: ReactNode;
  ariaLabel: string;
  /** Preferred menu width in px; clamped to the viewport. */
  width?: number;
  triggerClassName?: string;
  /** Heading for the mobile bottom-sheet (defaults to {@link ariaLabel}). */
  title?: string;
  /** Small glyph shown in the mobile sheet's header tile. */
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
};

/**
 * Theme-matched, portal-based menu for the Plan surface — shared by the country
 * switcher, sort control and basis picker so all behave identically. Two
 * responsive presentations behind one API: an edge-aware anchored dropdown on
 * tablet/desktop (viewport collision, outside-click close) and a branded
 * bottom-sheet with a dimming scrim on mobile — mirroring the sheet pattern used
 * by every other Plan overlay so a menu never floats over undimmed content.
 * Shared across both: Escape + mobile Back close, focus into the panel, and WAI
 * roving keyboard navigation. Portalled to `document.body` so it is never
 * clipped by an `overflow-hidden` ancestor.
 */
export default function PlanMenu({ trigger, ariaLabel, width = 260, triggerClassName, title, icon, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  useBackDismiss(open, () => setOpen(false));

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(width, window.innerWidth - 24);
    let left = r.left;
    if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12;
    if (left < 12) left = 12;
    setPos({ top: r.bottom + 6, left, width: w });
  }, [width]);

  function toggle() {
    if (!open && !isMobile) place();
    setOpen((o) => !o);
  }

  // Roving keyboard navigation for the menu items (WAI-ARIA menu pattern), shared
  // by every PlanMenu consumer so the country switcher and basis menu behave
  // identically. Items are real buttons (Tab-reachable); arrows/Home/End move
  // focus without leaving the open menu.
  const onPanelKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"],[role="menuitem"],button') ?? [],
    );
    if (items.length === 0) return;
    e.preventDefault();
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? items.length - 1
      : e.key === "ArrowDown" ? (idx + 1 + items.length) % items.length
      : (idx - 1 + items.length) % items.length;
    items[next]?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="menuitemradio"], button, [tabindex]')?.focus();
    });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    // Outside-click dismiss + reflow only apply to the anchored desktop dropdown;
    // the mobile sheet is dismissed by its scrim and Back button instead.
    if (isMobile) {
      return () => document.removeEventListener("keydown", onKey);
    }
    function onDown(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    const onReflow = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, isMobile, place]);

  const menuItems = (
    <div ref={panelRef} role="menu" aria-label={ariaLabel} onKeyDown={onPanelKey}>
      {children(() => setOpen(false))}
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && isMobile && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={ariaLabel}>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={close}
            className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeInUp_0.15s_ease-out]"
          />
          <div className="relative flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl border-t border-brand-100 bg-surface-1 shadow-2xl safe-bottom motion-safe:animate-[slideUp_0.2s_ease-out]">
            <SheetGrip />
            <div className="flex shrink-0 items-center gap-2.5 border-b border-brand-100 bg-gradient-to-b from-brand-50 to-white px-4 py-3">
              {icon != null && (
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-base shadow-sm ring-1 ring-brand-100"
                >
                  {icon}
                </span>
              )}
              <h3 className="min-w-0 flex-1 font-display text-[15px] font-bold leading-tight tracking-tight text-brand-950">
                {title ?? ariaLabel}
              </h3>
              <SheetCloseButton onClick={close} />
            </div>
            <div className="min-h-0 overflow-y-auto pb-4">{menuItems}</div>
          </div>
        </div>,
        document.body,
      )}

      {open && !isMobile && createPortal(
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
          className="overflow-hidden rounded-2xl border border-line bg-surface-1 shadow-xl motion-safe:animate-[fadeInUp_0.12s_ease-out]"
        >
          {menuItems}
        </div>,
        document.body,
      )}
    </>
  );
}
