import { describe, expect, it } from "vitest";

import {
	THEME_CSS_VAR_NAMES,
	buildTenantThemeCssString,
	themeColorsToCssVarEntries,
} from "@/lib/store-theme/apply-theme-css-vars";
import {
	PORTAL_ONLY_THEME_CSS_VARS,
	SHARED_THEME_CSS_VARS,
	extractCssVarNames,
} from "@/lib/store-theme/theme-css-var-contract";

/**
 * El gemelo de este fichero vive en
 * `Saas-Godcode-paneladmin-ceo/tests/lib/theme-css-var-contract.test.ts`.
 *
 * Un token renombrado en un solo repo no lanza ningún error: `var(--lo-que-sea)`
 * se queda vacío y el color cae al heredado. La UI se ve descolorida en un lado
 * y nadie se entera. Estos tests convierten ese silencio en un fallo.
 */
describe("contrato de variables CSS del tema", () => {
	const css = buildTenantThemeCssString({});

	it("THEME_CSS_VAR_NAMES es el contrato compartido más los extras del Portal", () => {
		expect([...THEME_CSS_VAR_NAMES]).toEqual([
			...SHARED_THEME_CSS_VARS,
			...PORTAL_ONLY_THEME_CSS_VARS,
		]);
	});

	it("el bloque CSS declara los mismos tokens que THEME_CSS_VAR_NAMES", () => {
		// El primer selector fija el fondo de html/body y no declara variables.
		expect(extractCssVarNames(css)).toEqual([...THEME_CSS_VAR_NAMES]);
	});

	it("las entradas aplicadas al DOM coinciden con el bloque CSS del SSR", () => {
		// Son dos caminos distintos —<style> en servidor, setProperty en cliente—
		// para el mismo tema. Si divergen, el preview no se parece a lo publicado.
		expect(themeColorsToCssVarEntries({}).map(([name]) => name)).toEqual([
			...THEME_CSS_VAR_NAMES,
		]);
	});

	it("emite todos los tokens compartidos con el Panel", () => {
		for (const name of SHARED_THEME_CSS_VARS) {
			expect(css).toMatch(new RegExp(`${name}:[^;]+;`));
		}
	});

	it("ningún token sale con valor vacío ni con un var() sin resolver", () => {
		for (const [name, value] of themeColorsToCssVarEntries({})) {
			expect(value, name).not.toBe("");
			expect(value, name).not.toContain("var(");
		}
	});
});
