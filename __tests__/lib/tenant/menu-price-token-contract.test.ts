import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PRODUCT_CARD_STYLES } from "@/lib/store-theme/theme-config";

/**
 * El panel de tienda expone "Color precio" y valida su contraste contra el
 * fondo en `buildStoreThemeChecklist`. Ese control solo dice la verdad si los
 * estilos de tarjeta pintan el precio con `--price-color` (las variantes de
 * Cristal comparten el mismo precio).
 *
 * Durante mucho tiempo no fue asi: solo Cristal leia el token. Los demas
 * llevaban `#fff` a pelo, y Horizontal y Gaming usaban `--tenant-primary`, lo
 * que con una marca oscura dejaba el precio en 3.2:1 sobre fondo negro — por
 * debajo del 4.5:1 exigido — mientras la checklist del panel informaba del
 * contraste del blanco que nadie estaba usando.
 *
 * Nada falla si esto se rompe otra vez: el precio simplemente deja de
 * responder al control y el aviso de contraste pasa a medir un color que no se
 * pinta. Por eso se fija aqui.
 */

const STYLES_DIR = join(process.cwd(), "app", "[subdomain]", "styles");

function readStyles(file: string): string {
	return readFileSync(join(STYLES_DIR, file), "utf8");
}

/**
 * Cuerpo de la regla que declara el color para ese selector.
 *
 * Un mismo selector aparece varias veces — la regla base y sus variantes dentro
 * de media queries, que solo ajustan tamano. Quedarse con la primera coincidencia
 * devolvia la del media query y daba un falso negativo, asi que se busca la que
 * realmente declara `color`.
 */
function colorRuleBody(css: string, selector: string): string | null {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const bodies = [...css.matchAll(new RegExp(`(?:^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, "gm"))].map(
		([, body]) => body,
	);
	if (bodies.length === 0) return null;
	return bodies.find((body) => /(?:^|[;\s])color:/.test(body)) ?? null;
}

/** Selector que pinta el precio vigente en cada estilo de tarjeta. */
const PRICE_SELECTOR_BY_STYLE: Record<string, { file: string; selector: string }> = {
	glass: { file: "GlassCard.css", selector: ".gcard__price-main" },
	"glass-row": { file: "GlassCard.css", selector: ".gcard__price-main" },
	"glass-plate": { file: "GlassCard.css", selector: ".gcard__price-main" },
	"glass-wide": { file: "GlassCard.css", selector: ".gcard__price-main" },
	"layout-carta": { file: "FoodCardLayouts.css", selector: ".product-layout-carta .fcard-price__now" },
	"layout-vitrina": { file: "FoodCardLayouts.css", selector: ".product-layout-vitrina .fcard-price__now" },
	"layout-cartel": { file: "FoodCardLayouts.css", selector: ".product-layout-cartel .fcard-price__now" },
	"layout-nori": { file: "FoodCardLayouts.css", selector: ".product-layout-nori .fcard-price__now" },
};

describe("precio del menu: contrato con --price-color", () => {
	it("cubre todos los estilos de tarjeta declarados", () => {
		expect(Object.keys(PRICE_SELECTOR_BY_STYLE).sort()).toEqual([...PRODUCT_CARD_STYLES].sort());
	});

	for (const style of PRODUCT_CARD_STYLES) {
		it(`${style} pinta el precio con var(--price-color)`, () => {
			const entry = PRICE_SELECTOR_BY_STYLE[style];
			const body = colorRuleBody(readStyles(entry.file), entry.selector);

			expect(body, `no se encontro una regla con color para ${entry.selector} en ${entry.file}`).not.toBeNull();
			expect(body).toMatch(/color:\s*var\(--price-color/);
		});
	}

	it("el precio rebajado usa --discount-color en todos los estilos", () => {
		const css = readStyles("FoodCardLayouts.css");
		const saleColors = [...css.matchAll(/\.layout-price--sale[^{]*\{([^}]*)\}/g)]
			.map(([, body]) => /color:\s*([^;]+);/.exec(body)?.[1]?.trim())
			.filter((value): value is string => Boolean(value));

		expect(saleColors.length).toBeGreaterThan(0);
		for (const color of saleColors) {
			expect(color).toMatch(/var\(--discount-color/);
		}
	});

	it("ningun estilo pinta el precio con el color de marca", () => {
		for (const { file, selector } of Object.values(PRICE_SELECTOR_BY_STYLE)) {
			const body = colorRuleBody(readStyles(file), selector);
			expect(body, selector).not.toMatch(/color:\s*var\(--tenant-primary/);
		}
	});
});
