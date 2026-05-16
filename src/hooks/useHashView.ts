import { useState, useEffect } from "react";

export type AppView = "map" | "calendar" | "list" | "trips" | "discover";

const VALID_VIEWS: AppView[] = ["calendar", "list", "trips", "discover"];

function parseHash(): AppView {
  const h = window.location.hash.slice(1);
  return VALID_VIEWS.includes(h as AppView) ? (h as AppView) : "map";
}

export function useHashView() {
  const [view, setView] = useState<AppView>(parseHash);

  useEffect(() => {
    const hash = `#${view}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, [view]);

  useEffect(() => {
    const handle = () => setView(parseHash());
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);

  return [view, setView] as const;
}
