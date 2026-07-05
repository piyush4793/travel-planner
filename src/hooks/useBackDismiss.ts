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

type OverlayEntry = { id: number; dismiss: () => void; persistent: boolean };

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
  const top = stack[stack.length - 1];
  if (!top) return;
  top.dismiss();
  if (top.persistent) {
    // A persistent guard (e.g. the wizard step-back) stays registered across
    // dismissals — its `dismiss` steps one level back and its `open` flag flips
    // only once the last level is left. Re-arm the sentinel so the next Back is
    // still guarded; the effect cleanup rewinds it when `open` finally goes false.
    pushSentinel();
    return;
  }
  stack.pop();
  // Keep guarding the overlays that are still open.
  if (stack.length > 0) pushSentinel();
}

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("popstate", handlePop);
}

function register(dismiss: () => void, persistent: boolean): number {
  ensureListener();
  const id = ++counter;
  stack.push({ id, dismiss, persistent });
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
 * @param open       Whether the overlay is currently shown.
 * @param onDismiss  Called to close the overlay (Back button or programmatic).
 * @param persistent When true the guard survives repeated Back presses while
 *                   `open` stays true — each Back invokes `onDismiss` (which
 *                   should step one level back) and the guard re-arms itself.
 *                   Use for multi-step flows (e.g. a wizard) where a single
 *                   `open` window spans several dismissable levels. Defaults to
 *                   the transient open/close behaviour.
 * @returns A `close` function to funnel programmatic closes (X / Escape /
 *          backdrop) through the same path, keeping the history stack balanced.
 */
export function useBackDismiss(open: boolean, onDismiss: () => void, persistent = false): () => void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;
    const id = register(() => onDismissRef.current(), persistent);
    return () => unregister(id);
  }, [open, persistent]);

  return useCallback(() => onDismissRef.current(), []);
}
