import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "lcov"],
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 60,
        lines: 75,
      },
    },
  },
});
