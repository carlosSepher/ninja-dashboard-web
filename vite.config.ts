import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const conciliatorTarget = process.env.VITE_CONCILIATOR_HEALTH_TARGET ?? "http://127.0.0.1:8300";
const conciliatorPath = process.env.VITE_CONCILIATOR_HEALTH_PATH ?? "/api/v1/health/metrics";

export default defineConfig({
  base: "/dashboard/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/conciliator-health": {
        target: conciliatorTarget,
        changeOrigin: true,
        rewrite: (path) => {
          const queryIndex = path.indexOf("?");
          const query = queryIndex >= 0 ? path.slice(queryIndex) : "";
          return `${conciliatorPath}${query}`;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "playwright.config.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
