import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dashboard/**", "dist/**", "node_modules/**", ".mcp-observatory/**", "github-app/**", "scripts/evaluate-permission-delta-conformance.ts"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts"]
  })),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error"
    }
  }
);
