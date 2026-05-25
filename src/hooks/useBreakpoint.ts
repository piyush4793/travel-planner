import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const TABLET_QUERY = "(min-width: 768px)";
const DESKTOP_QUERY = "(min-width: 1024px)";

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia(DESKTOP_QUERY).matches) return "desktop";
  if (window.matchMedia(TABLET_QUERY).matches) return "tablet";
  return "mobile";
}

/** Reactive breakpoint hook — returns 'mobile' | 'tablet' | 'desktop' */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState(getBreakpoint);

  useEffect(() => {
    const tabletMq = window.matchMedia(TABLET_QUERY);
    const desktopMq = window.matchMedia(DESKTOP_QUERY);
    const handler = () => setBp(getBreakpoint());
    tabletMq.addEventListener("change", handler);
    desktopMq.addEventListener("change", handler);
    return () => {
      tabletMq.removeEventListener("change", handler);
      desktopMq.removeEventListener("change", handler);
    };
  }, []);

  return bp;
}
