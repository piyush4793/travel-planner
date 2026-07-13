import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "/travel-planner/",
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: {
    chunkSizeWarningLimit: 850,
    // Force-inline the brand mark as a base64 data URL so the PDF generator can
    // stamp it synchronously via jsPDF addImage (offline, no fetch). Everything
    // else keeps Vite's default 4KB threshold. (Vite 5 has no `?inline` query.)
    assetsInlineLimit: (filePath: string) =>
      filePath.includes("brandMark") ? true : undefined,
    rollupOptions: {
      output: {
        manualChunks: {
          "maplibre": ["maplibre-gl"],
          "react-vendor": ["react", "react-dom"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/vite-env.d.ts",
        "src/main.tsx",
        // Type-only and barrel exports — no runtime logic to test
        "src/core/types.ts",
        // CountryRule/CityRule declarations are type-only; runtime coverage is not meaningful.
        "src/core/data/itineraryRules.ts",
        // DestinationSource is the pure interface/type seam; PlanActions is a type bundle — no runtime logic.
        "src/core/trip/destinationSource.ts",
        "src/components/views/plan/shell/planActions.ts",
        "src/core/ports/**",
        "src/core/index.ts",
        // Data loader uses import.meta.glob (Vite-only, not unit-testable)
        "src/data/**",
      ],
      thresholds: {
        // Global floor — total statement/line coverage must stay at or above 90%.
        // Enforced on every commit via the pre-commit hook and `npm run validate`.
        statements: 90,
        lines: 90,
        "src/core/utils/**": {
          statements: 80,
          branches: 70,
          functions: 80,
        },
        "src/core/data/**": {
          statements: 60,
          branches: 60,
          functions: 60,
        },
        "src/hooks/**": {
          statements: 60,
          branches: 55,
          functions: 60,
        },
        "src/utils/**": {
          statements: 60,
          branches: 50,
          functions: 60,
        },
        "src/components/**": {
          statements: 80,
          branches: 80,
          functions: 75,
          lines: 80,
        },
      },
    },
  },
});
