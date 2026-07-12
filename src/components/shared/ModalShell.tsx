import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useBackDismiss } from "../../hooks/useBackDismiss";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Prevents backdrop click from closing (e.g. during async operations) */
  preventClose?: boolean;
  className?: string;
  backdropClassName?: string;
  children: React.ReactNode;
  /** aria-label for the dialog (ignored when {@link labelledBy} is set). */
  label?: string;
  /** ARIA role — use "alertdialog" for confirm/destructive prompts. */
  role?: "dialog" | "alertdialog";
  /** id of the element labelling the dialog (takes precedence over {@link label}). */
  labelledBy?: string;
  /** id of the element describing the dialog. */
  describedBy?: string;
};

/**
 * Shared modal shell with accessibility: focus trap, Escape handling,
 * scroll lock, role="dialog", aria-modal, and backdrop click to close.
 */
export default function ModalShell({
  open,
  onClose,
  preventClose,
  className = "",
  backdropClassName = "",
  children,
  label,
  role = "dialog",
  labelledBy,
  describedBy,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const isMobile = useBreakpoint() === "mobile";

  const safeClose = useCallback(() => {
    if (!preventClose) onClose();
  }, [preventClose, onClose]);

  // On mobile, let the device Back button dismiss the modal before navigating.
  // safeClose honors preventClose, so a locked modal stays open on Back too.
  useBackDismiss(open && isMobile, safeClose);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); safeClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, safeClose]);

  // Scroll lock + focus management
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first focusable element inside
    requestAnimationFrame(() => {
      const el = dialogRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? el).focus();
    });

    return () => {
      document.body.style.overflow = prev;
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const el = dialogRef.current;
      if (!el) return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center ${backdropClassName || "bg-black/60 backdrop-blur-sm"}`}
      onClick={(e) => { if (e.target === e.currentTarget) safeClose(); }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
