import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

// Tests that set process.env.TZ at the top of the file need a process of their own (REQ-UI-131).
const TZ_TESTS = "**/*.tz.test.ts";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: { proxy: { "/api": "http://127.0.0.1:8700" } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // vmThreads reuses one jsdom per worker instead of building it for every file (97 s -> about 36 s);
    // each file still runs in its own context.
    projects: [
      { extends: true, test: { name: "unit", pool: "vmThreads", exclude: [...configDefaults.exclude, TZ_TESTS] } },
      { extends: true, test: { name: "time-zone", pool: "forks", include: [TZ_TESTS] } },
    ],
  },
});
