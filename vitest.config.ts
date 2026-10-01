import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/cli.ts",
        "src/server.ts",
        "src/commands/**",
        "src/tools/**",
        "src/index.ts",
        "src/risk-taxonomy.ts",
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 70,
        functions: 88,
        lines: 85,
        statements: 83
      }
    }
  }
});
