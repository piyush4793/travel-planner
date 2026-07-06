import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBackDismiss } from "../../../hooks/useBackDismiss";

type Props = {
  /** Trigger button content (label / flag / caret handled by caller). */
  trigger: React.ReactNode;
  ariaLabel: string;
  /** Preferred menu width in px; clamped to the viewport. */
  width?: number;
  triggerClassName?: string;
  children: (close: () => void) => React.ReactNode;
};

/**
 * Theme-matched, portal-based dropdown for the Plan surface — shared by the
 * country switcher and the sort control so both behave identically (viewport
 * collision, Escape + outside-click close, focus into the panel, mobile Back
 * dismiss). Portalled to `document.body` so it never clips inside the step's
 * inner scroll container.
 */
export default function PlanMenu({ trigger, ariaLabel, width = 260, triggerClassName, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
    if (!open) place();
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="menuitemradio"], button, [tabindex]')?.focus();
    });
    function onDown(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    }
    const onReflow = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, place]);

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
      {open && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label={ariaLabel}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
          className="overflow-hidden rounded-2xl border border-[#e6e1d4] bg-white shadow-xl motion-safe:animate-[fadeInUp_0.12s_ease-out]"
        >
          {children(() => setOpen(false))}
        </div>,
        document.body,
      )}
    </>
  );
}
