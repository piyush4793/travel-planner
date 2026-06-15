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
        // Components need integration/e2e tests, not unit coverage.
        // Industry standard: unit coverage targets business logic, not UI rendering.
        "src/components/**",
        // Type-only and barrel exports — no runtime logic to test
        "src/core/types.ts",
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
          statements: 50,
          branches: 50,
          functions: 50,
        },
        "src/utils/**": {
          statements: 40,
          branches: 40,
          functions: 40,
        },
      },
    },
  },
});
