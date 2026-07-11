/** @type {import('tailwindcss').Config} */
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
          DEFAULT: "#e4dece", // hairline borders / dividers
          strong: "#d8d2c2", // emphasized borders
        },
        surface: {
          1: "#faf8f1", // lightest card / raised surface
          2: "#f7f4ec", // panel / section fill
          3: "#f2efe6", // subtle inset tint
        },
      },
    },
  },
  plugins: [],
};
