import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  /** Re-hydrate handler. May be async; the spinner shows until it resolves. */
  onRefresh: () => void | Promise<void>;
  /** Gate the gesture (e.g. mobile only, no overlay open). */
  enabled?: boolean;
  /** Pull distance (px) required to trigger a refresh. */
  threshold?: number;
  /** Visual cap (px) the indicator can travel to. */
  maxPull?: number;
};

const DEFAULT_THRESHOLD = 70;
const DEFAULT_MAX_PULL = 110;
const RESISTANCE = 0.5;
const MIN_SPINNER_MS = 450;

// Climb from the touch target to the container, returning the nearest ancestor
// that actually scrolls vertically. Falls back to the container itself.
function findScrollable(target: EventTarget | null, container: HTMLElement): HTMLElement {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== container) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return container;
}

/**
 * Touch pull-to-refresh for the locked app shell (native PTR is suppressed by
 * `overscroll-behavior: none`). Engages only when the active inner scroll region
 * is already at the top, applies rubber-band resistance, and calls `onRefresh`
 * once the pull passes the threshold.
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = DEFAULT_THRESHOLD,
  maxPull = DEFAULT_MAX_PULL,
}: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const engaged = useRef(false);
  const scrollEl = useRef<HTMLElement | null>(null);
  // Holds the pending min-spinner timer so it can be cleared on unmount,
  // preventing a stale setState after teardown.
  const spinnerTimer = useRef<number | null>(null);
  // Keep the latest values without re-binding native listeners every render.
  const refreshingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const reset = useCallback(() => {
    engaged.current = false;
    scrollEl.current = null;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (!enabledRef.current || refreshingRef.current || e.touches.length !== 1) return;
      const el = findScrollable(e.target, container);
      if (el.scrollTop > 0) return;
      scrollEl.current = el;
      startY.current = e.touches[0].clientY;
      engaged.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!engaged.current || refreshingRef.current) return;
      const el = scrollEl.current;
      if (el && el.scrollTop > 0) { reset(); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPullDistance(0); return; }
      // Non-passive listener lets us swallow the scroll while pulling.
      e.preventDefault();
      setPullDistance(Math.min(maxPull, dy * RESISTANCE));
    };

    const onTouchEnd = () => {
      if (!engaged.current) return;
      engaged.current = false;
      scrollEl.current = null;
      setPullDistance((current) => {
        if (current < threshold || refreshingRef.current) return 0;
        refreshingRef.current = true;
        setRefreshing(true);
        const started = Date.now();
        Promise.resolve(onRefreshRef.current())
          .catch(() => {})
          .then(() => {
            const wait = Math.max(0, MIN_SPINNER_MS - (Date.now() - started));
            spinnerTimer.current = window.setTimeout(() => {
              spinnerTimer.current = null;
              refreshingRef.current = false;
              setRefreshing(false);
              setPullDistance(0);
            }, wait);
          });
        return threshold;
      });
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", reset);
    };
  }, [maxPull, threshold, reset]);

  // Clear any pending min-spinner timer on unmount.
  useEffect(() => () => {
    if (spinnerTimer.current !== null) window.clearTimeout(spinnerTimer.current);
  }, []);

  return { containerRef, pullDistance, refreshing, threshold } as const;
}
