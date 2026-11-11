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
    // Generated QA evidence. The Playwright HTML report ships third-party
    // bundles (CodeMirror, the service worker) that are not our source and
    // must not be linted - doing so added 133 errors and broke CI.
    "scripts/qa/results/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
