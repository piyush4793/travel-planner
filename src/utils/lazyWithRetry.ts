import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

const RELOAD_KEY = "roamwise:chunk-reload-at";

// After a new deploy, already-open clients hold references to the previous
// build's hashed chunk names. Requesting one of those now-removed files rejects
// the dynamic import ("Failed to fetch dynamically imported module"). Recovering
// only needs fresh HTML, so on failure we force a single full reload — guarded
// by a short time window so a genuinely broken chunk can't cause a reload loop.
const RELOAD_WINDOW_MS = 10_000;

function shouldReloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last > RELOAD_WINDOW_MS) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      return true;
    }
  } catch {
    // sessionStorage unavailable (e.g. privacy mode) — fall through to rethrow.
  }
  return false;
}

/**
 * Drop-in replacement for `React.lazy` that survives stale-chunk failures after
 * a deploy by reloading once to pick up the new asset manifest. A second failure
 * within the guard window rethrows so the ErrorBoundary can surface it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own signature to preserve component prop types
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (shouldReloadOnce()) {
        window.location.reload();
        // Never resolve — the reload replaces this document before render.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}
