import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/travel-planner/",
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
      ],
      thresholds: {
        // Core logic must stay well-tested
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
      },
    },
  },
});
