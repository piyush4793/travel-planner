import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/travel-planner/",
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: {
    chunkSizeWarningLimit: 850,
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
        "src/core/ports/**",
        "src/core/index.ts",
        // Data loader uses import.meta.glob (Vite-only, not unit-testable)
        "src/data/**",
      ],
      thresholds: {
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
          statements: 4,
          branches: 2,
          functions: 4,
        },
      },
    },
  },
});
