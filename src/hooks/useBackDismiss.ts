import { useCallback, useEffect, useRef } from "react";

// ── Shared overlay back-stack ────────────────────────────────────────────────
// Lets the device / browser Back button dismiss open overlays (panels, modals,
// popovers, dialogs) one at a time — topmost first — before performing the
// app's general back navigation.
//
// Design: every open overlay registers a dismiss handler on a module-level LIFO
// stack. A single sentinel history entry guards the stack: it is pushed when the
// stack becomes non-empty and consumed when it empties, and it is re-pushed after
// each Back-driven dismiss while overlays remain. This keeps exactly one extra
// history entry regardless of how deeply overlays are nested, so the history
// stack never drifts no matter how an overlay is dismissed (Back button, X
// button, Escape, backdrop tap, or a reactive parent state change).

type OverlayEntry = { id: number; dismiss: () => void };

const SENTINEL = { tpOverlay: true } as const;
const stack: OverlayEntry[] = [];
let counter = 0;
// Number of upcoming popstate events we triggered ourselves and must ignore, so
// programmatic closes don't double-dismiss when they rewind the sentinel.
let ignorePops = 0;
let listenerAttached = false;

function hasSentinel(): boolean {
  return (window.history.state as { tpOverlay?: boolean } | null)?.tpOverlay === true;
}

function pushSentinel() {
  if (!hasSentinel()) window.history.pushState(SENTINEL, "");
}

function rewindSentinel() {
  if (hasSentinel()) {
    ignorePops++;
    window.history.back();
  }
}

function handlePop() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  const entry = stack.pop();
  if (!entry) return;
  entry.dismiss();
  // Keep guarding the overlays that are still open.
  if (stack.length > 0) pushSentinel();
}

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("popstate", handlePop);
}

function register(dismiss: () => void): number {
  ensureListener();
  const id = ++counter;
  stack.push({ id, dismiss });
  pushSentinel();
  return id;
}

function unregister(id: number) {
  const idx = stack.findIndex((e) => e.id === id);
  if (idx === -1) return; // already popped by a Back-driven dismiss
  stack.splice(idx, 1);
  // Consume the sentinel only once the last overlay is gone; while others remain
  // it must stay to keep guarding them.
  if (stack.length === 0) rewindSentinel();
}

/**
 * Register an overlay for Back-button dismissal while `open` is true.
 *
 * @param open      Whether the overlay is currently shown.
 * @param onDismiss Called to close the overlay (Back button or programmatic).
 * @returns A `close` function to funnel programmatic closes (X / Escape /
 *          backdrop) through the same path, keeping the history stack balanced.
 */
export function useBackDismiss(open: boolean, onDismiss: () => void): () => void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;
    const id = register(() => onDismissRef.current());
    return () => unregister(id);
  }, [open]);

  return useCallback(() => onDismissRef.current(), []);
}
