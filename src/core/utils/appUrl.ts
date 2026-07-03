/**
 * Absolute URL of the deployed app (works on any host / subpath, e.g. the
 * GitHub Pages `/travel-planner/` base). Shared by app-share and open-app flows.
 */
export function appUrl(): string {
  if (typeof window === "undefined") return "";
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}
