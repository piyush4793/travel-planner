// Brand + accent color ramps — the single source of truth for the app's accent
// palette. Consumed by Tailwind (`brand-*` / `accent-*` utility classes, wired
// in `tailwind.config.js`) AND by the handful of runtime call-sites that need
// raw hex where a Tailwind class can't reach: maplibre paint layers
// (ItineraryCinematic), the print-HTML theme (pdfExport), inline SVG/slider
// gradients (vehicleMarkers, DayLengthControl). Keeping every accent hex here
// means a rebrand is a one-file edit — update these two ramps (and the mirrored
// `--brand-700` CSS var in index.css, the lone spot JS can't feed) and the whole
// app — classes, map, PDF, gradients — follows.
//
// The current values are the exact Tailwind `emerald` (brand) and `amber`
// (accent) ramps, so the palette rename is a pixel-for-pixel no-op.

export const BRAND = {
  50: "#ecfdf5",
  100: "#d1fae5",
  200: "#a7f3d0",
  300: "#6ee7b7",
  400: "#34d399",
  500: "#10b981",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
  900: "#064e3b",
  950: "#022c22",
} as const;

export const ACCENT = {
  50: "#fffbeb",
  100: "#fef3c7",
  200: "#fde68a",
  300: "#fcd34d",
  400: "#fbbf24",
  500: "#f59e0b",
  600: "#d97706",
  700: "#b45309",
  800: "#92400e",
  900: "#78350f",
  950: "#451a03",
} as const;
