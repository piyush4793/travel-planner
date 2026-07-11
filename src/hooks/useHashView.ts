import { useState, useEffect, useLayoutEffect } from "react";

export type AppView = "plan" | "trips" | "calendar" | "discover";

const VALID_VIEWS: AppView[] = ["plan", "trips", "calendar", "discover"];

function parseHash(fallback: AppView): AppView {
  const h = window.location.hash.slice(1);
  return VALID_VIEWS.includes(h as AppView) ? (h as AppView) : fallback;
}

/**
 * Hash-based routing for the top-level views. `fallback` is the landing view used
 * when the hash is empty or invalid — the app passes `plan`, the default landing
 * view (the brand/Home button routes there too).
 */
export function useHashView(fallback: AppView = "plan") {
  const [view, setView] = useState<AppView>(() => parseHash(fallback));

  // Push the new hash in a *layout* effect so it commits before any passive
  // cleanup elsewhere in the tree. A view that owns a back-dismiss guard (e.g.
  // PlanView) rewinds its history sentinel via `history.back()` in a passive
  // destroy on unmount; React runs all passive destroys before passive creates,
  // so a passive push here would land *after* that rewind and get clobbered
  // (the nav would bounce back). A layout push runs first, so the sentinel is no
  // longer the current entry when the rewind checks — it correctly skips.
  useLayoutEffect(() => {
    const hash = `#${view}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, [view]);

  useEffect(() => {
    const handle = () => setView(parseHash(fallback));
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, [fallback]);

  return [view, setView] as const;
}
