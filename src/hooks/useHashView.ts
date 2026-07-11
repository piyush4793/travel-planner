import { useState, useEffect } from "react";

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

  useEffect(() => {
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
