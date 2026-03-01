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
  ]),
  {
    rules: {
      // API response shapes are not yet fully typed — tracked as warnings
      // while the codebase incrementally migrates to strict types.
      "@typescript-eslint/no-explicit-any": "warn",
      // JSX text entities — cosmetic, not a runtime risk.
      "react/no-unescaped-entities": "warn",
      // React Compiler immutability hints — advisory, not errors.
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
