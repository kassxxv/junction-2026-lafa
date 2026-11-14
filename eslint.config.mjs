import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Python side (uv-managed venv and the Context.dev prototype):
    ".venv/**",
    "src/**",
    // Playwright MCP plugin output (screenshots, logs, scratch scripts):
    ".playwright-mcp/**",
  ]),
]);

export default eslintConfig;
