import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}",
      "tests/security/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "node_modules/**",
      ".next/**",
      "tests/e2e/**",
      "tests/load/**",
    ],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
