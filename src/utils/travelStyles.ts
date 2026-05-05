import type { TravelStyle, PlanStyle } from "../types";

export type StyleMeta = {
  icon: string;
  label: string;
  description: string;
  badge: string;        // panel badge classes
  activePill: string;   // filter bar active classes
  activeForm: string;   // form button active classes
};

export const STYLE_META: Record<TravelStyle, StyleMeta> = {
  "touch-and-go": {
    icon: "🏃",
    label: "Touch & Go",
    description: "Cover as many countries as possible with very little time spent in each. Great for stopovers and quick highlights.",
    badge:      "bg-orange-100 text-orange-700",
    activePill: "bg-orange-500 text-white shadow-sm",
    activeForm: "border-orange-400 bg-orange-50 text-orange-700",
  },
  "explorer": {
    icon: "🔭",
    label: "Explorer",
    description: "7–14 days to properly tour a country. Take your time, see the highlights, and explore without rushing.",
    badge:      "bg-indigo-100 text-indigo-700",
    activePill: "bg-indigo-600 text-white shadow-sm",
    activeForm: "border-indigo-400 bg-indigo-50 text-indigo-700",
  },
  "month-long": {
    icon: "🌿",
    label: "Month Long",
    description: "Long-duration travellers who love slow travel — living like a local and going deep into the culture.",
    badge:      "bg-emerald-100 text-emerald-700",
    activePill: "bg-emerald-600 text-white shadow-sm",
    activeForm: "border-emerald-400 bg-emerald-50 text-emerald-700",
  },
};

export const TRAVEL_STYLES: TravelStyle[] = ["touch-and-go", "explorer", "month-long"];

export const PLAN_STYLE_META: Record<PlanStyle, StyleMeta> = {
  ...STYLE_META,
  "custom": {
    icon: "✏️",
    label: "Custom",
    description: "Set your own number of days and we'll build a city-by-city itinerary around your timeline.",
    badge:      "bg-violet-100 text-violet-700",
    activePill: "bg-violet-600 text-white shadow-sm",
    activeForm: "border-violet-400 bg-violet-50 text-violet-700",
  },
};

export const PLAN_STYLES: PlanStyle[] = ["touch-and-go", "explorer", "month-long", "custom"];
