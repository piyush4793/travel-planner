/** @type {import('tailwindcss').Config} */
import { BRAND, ACCENT } from "./src/core/theme/palette";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Luxury warm-ivory design tokens — one source of truth for the neutral
        // ramp so surfaces/borders/ink stay consistent across the app (replaces
        // ~40 hand-picked near-duplicate hexes that had drifted apart).
        ink: {
          1: "#16241d", // headings / strongest ink (warm-green near-black)
          body: "#3c463f", // body copy
          2: "#6f6a5d", // secondary / muted label
          3: "#8a8577", // tertiary / caption
          4: "#a8a293", // quaternary / faint hint
        },
        line: {
          DEFAULT: "#e0d6c0", // hairline borders / dividers
          strong: "#cfc3a6", // emphasized borders
        },
        surface: {
          1: "#fbf9f2", // lightest card / raised surface (ivory, lifts above canvas)
          2: "#f4eede", // panel / section fill
          3: "#eee6d3", // page canvas / subtle inset tint (visible warm cream)
          track: "#e7dcc4", // sunken well / pill track / header / button fill
        },
        // Primary brand accent ramp — semantic indirection over emerald so a
        // future rebrand is a one-file swap. Sourced from the shared palette
        // module (src/core/theme/palette.ts) so the same hex feeds Tailwind
        // classes AND the runtime hex consumers (maplibre, PDF, gradients).
        brand: BRAND,
        // Secondary accent ramp — anchor/warnings (mirrors Tailwind amber today).
        accent: ACCENT,
      },
    },
  },
  plugins: [],
};
