import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useBackDismiss } from "../../hooks/useBackDismiss";

type Props = {
  label: string;
  active: boolean;
  children: (close: () => void) => React.ReactNode;
};

export default function FilterChip({ label, active, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useBreakpoint() === "mobile";

  // On mobile, let the device Back button close the dropdown first.
  useBackDismiss(open && isMobile, () => setOpen(false));

  function toggle() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const panelWidth = 240;
      let left = r.left;
      // Prevent overflow on the right edge
      if (left + panelWidth > window.innerWidth - 12) {
        left = window.innerWidth - panelWidth - 12;
      }
      // Prevent overflow on the left edge
      if (left < 12) left = 12;
      setPos({ top: r.bottom + 6, left });
    }
    setOpen(o => !o);
  }

  // Focus trap: move focus into panel when opened, trap Tab within
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Move focus to first focusable in panel
    requestAnimationFrame(() => {
      const items = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (items?.length) items[0].focus();
    });

    function onDown(e: MouseEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", trapFocus);
    };
  }, [open, trapFocus]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border focus-ring ${
          active
            ? "bg-brand-700 text-white border-brand-700 shadow-sm"
            : open
            ? "bg-surface-track text-ink-body border-line-strong"
            : "bg-surface-1 text-ink-2 border-line hover:border-line-strong hover:bg-surface-2"
        }`}
      >
        {label}
        <svg
          className={`w-2.5 h-2.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999 }}
          className="bg-surface-1 border border-line rounded-2xl shadow-xl"
        >
          {children(() => setOpen(false))}
        </div>,
        document.body
      )}
    </>
  );
}
