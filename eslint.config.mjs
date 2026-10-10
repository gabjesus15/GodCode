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
    // Mismos archivos que registran el plugin `react` en eslint-config-next: sin
    // esto `npm run lint` fallaba al llegar a archivos .cjs.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
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
  // Scripts CommonJS (generadores de video): `require` es su forma de importar.
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Navegación con <a> a rutas internas para forzar recarga completa (evita estilos residuales tras 404/onboarding).
  {
    files: ["app/onboarding/layout.tsx", "app/sobre-godcode/page.tsx"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Imágenes generadas con ImageResponse (Satori): solo aceptan <img> plano. La regla ya las
  // salta en Linux, pero en Windows su chequeo de ruta falla; así el resultado es igual en ambos.
  {
    files: ["app/**/opengraph-image.tsx", "app/**/twitter-image.tsx", "app/**/icon.tsx", "app/**/og-image/route.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
