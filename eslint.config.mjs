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
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow inline styles for CSS custom properties (CSS variables)
      "@next/next/no-css-tags": "off",
      // Disable inline styles warning - required for dynamic CSS custom properties
      "react/no-unknown-property": ["error", { "ignore": ["style"] }],
      // Variables/params prefixed with _ are intentionally unused (e.g. destructured but not consumed)
      "@typescript-eslint/no-unused-vars": ["warn", {
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
      }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Navegación con <a> a rutas internas para forzar recarga completa (evita estilos residuales tras 404/onboarding).
  {
    files: ["app/onboarding/layout.tsx", "app/sobre-godcode/page.tsx"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
