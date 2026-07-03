import { useCallback, useEffect, useRef } from "react";

// Lets the browser / device Back button dismiss an open overlay (panel, modal).
// While `open`, one history entry is pushed so Back pops it instead of leaving
// the app. The returned `close` funnels programmatic closes (X button, Escape,
// backdrop tap) through history.back() as well, so the history stack stays
// balanced no matter how the overlay is dismissed.
export function useBackDismiss(open: boolean, onDismiss: () => void): () => void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ tpOverlay: true }, "");
    const onPop = () => onDismissRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  return useCallback(() => {
    if ((window.history.state as { tpOverlay?: boolean } | null)?.tpOverlay) {
      window.history.back();
    } else {
      onDismissRef.current();
    }
  }, []);
}
