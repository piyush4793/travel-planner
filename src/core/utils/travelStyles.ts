import type { TravelStyle } from "../types";

export type StyleMeta = {
  icon: string;
  label: string;
  description: string;
  badge: string;      // panel badge classes
  activeForm: string; // form button active classes
};

export const STYLE_META: Record<TravelStyle, StyleMeta> = {
  "touch-and-go": {
    icon: "🏃",
    label: "Touch & Go",
    description: "Cover as many countries as possible with very little time spent in each. Great for stopovers and quick highlights.",
    badge:      "bg-orange-100 text-orange-700",
    activeForm: "border-orange-400 bg-orange-50 text-orange-700",
  },
  "explorer": {
    icon: "🔭",
    label: "Explorer",
    description: "7–14 days to properly tour a country. Take your time, see the highlights, and explore without rushing.",
    badge:      "bg-indigo-100 text-indigo-700",
    activeForm: "border-indigo-400 bg-indigo-50 text-indigo-700",
  },
  "immersive": {
    icon: "🌿",
    label: "Immersive",
    description: "Deep travel — stay longer, live like a local, and fully absorb the culture, landscapes, and hidden corners.",
    badge:      "bg-emerald-100 text-emerald-700",
    activeForm: "border-emerald-400 bg-emerald-50 text-emerald-700",
  },
};

export const TRAVEL_STYLES: TravelStyle[] = ["touch-and-go", "explorer", "immersive"];

/**
 * Default trip length (in days) implied by a travel style, given a country's
 * recommended and maximum useful days:
 *  - touch-and-go → a brisk ~60% of recommended (min 1 day)
 *  - explorer     → the recommended length
 *  - immersive    → the full maximum useful length
 * Falls back to `recDays` when no style is set. The result is only a starting
 * point for the day slider — the itinerary engine clamps and re-plans from here.
 */
export function defaultDaysForStyle(
  style: TravelStyle | undefined,
  recDays: number,
  maxDays: number,
): number {
  switch (style) {
    case "touch-and-go":
      return Math.max(1, Math.round(recDays * 0.6));
    case "immersive":
      return Math.max(recDays, maxDays);
    case "explorer":
    default:
      return recDays;
  }
}
