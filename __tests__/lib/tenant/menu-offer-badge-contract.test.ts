import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/store-theme/store-theme-utils";

/**
 * El distintivo de "Oferta" se tenia del token `--price-color`, que es el color
 * que el tenant elige para los PRECIOS. En un negocio real ese color es blanco,
 * asi que `color-mix(in srgb, var(--price-color) 38%, #000 62%)` resolvia a un
 * gris #616161: el aviso de rebaja se pintaba gris en un menu cuya marca es
 * roja y cuyo color de rebaja es ambar.
 *
 * Lo importante es que NADA fallaba. El contraste era 6.19:1, muy por encima
 * del minimo, y un escaneo de accesibilidad no señala nada: el problema no era
 * la legibilidad, era que el color no significaba lo que decia significar.
 *
 * Este test fija las dos mitades de la decision:
 *
 *  1. El color del distintivo no depende de ningun token que el tenant pueda
 *     cambiar. Va sobre la foto del plato —que puede ser de cualquier color— y
 *     tiene que decir "rebajado" igual en todos los menus.
 *  2. El par fondo/texto que se elija tiene que pasar el 4.5:1 que pide el
 *     texto normal, porque el distintivo es texto pequeño.
 */

const CSS = readFileSync(
	join(process.cwd(), "app", "[subdomain]", "styles", "TenantUiPrimitives.css"),
	"utf8",
);

/** Tokens que el tenant configura y que por tanto no pueden decidir este color. */
const TOKENS_DEL_TENANT = [
	"--price-color",
	"--discount-color",
	"--tenant-primary",
	"--accent-primary",
	"--accent-secondary",
];

function reglasDe(selectorParcial: string): string[] {
	const escapado = selectorParcial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return [...CSS.matchAll(new RegExp(`([^{}]*${escapado}[^{}]*)\\{([^}]*)\\}`, "g"))].map(
		(m) => m[2],
	);
}

describe("contrato del distintivo de oferta", () => {
	const cuerpos = reglasDe(".tenant-ui-badge--destructive");

	it("encuentra las reglas que lo pintan", () => {
		expect(cuerpos.length).toBeGreaterThan(0);
	});

	it("no cuelga de ningun color que el tenant pueda cambiar", () => {
		for (const cuerpo of cuerpos) {
			for (const token of TOKENS_DEL_TENANT) {
				expect(cuerpo).not.toContain(token);
			}
		}
	});

	it("declara su color con tokens propios y fijos", () => {
		for (const cuerpo of cuerpos) {
			expect(cuerpo).toContain("--badge-offer-bg");
			expect(cuerpo).toContain("--badge-offer-fg");
		}
	});

	it("el par fondo/texto pasa el 4.5:1 del texto normal", () => {
		const valor = (nombre: string) =>
			new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{3,8})`).exec(CSS)?.[1];

		const fondo = valor("--badge-offer-bg");
		const texto = valor("--badge-offer-fg");
		expect(fondo).toBeDefined();
		expect(texto).toBeDefined();

		const ratio = contrastRatio(fondo!, texto!);
		expect(ratio).not.toBeNull();
		expect(ratio!).toBeGreaterThanOrEqual(4.5);
	});
});

describe("contrato de los distintivos especial y promocion", () => {
	const cuerposEspecial = reglasDe(".tenant-ui-badge--special");
	const cuerposPromo = reglasDe(".tenant-ui-badge--promo");

	it("encuentra las reglas para especial y promocion", () => {
		expect(cuerposEspecial.length).toBeGreaterThan(0);
		expect(cuerposPromo.length).toBeGreaterThan(0);
	});

	it("no cuelgan de tokens modificables del tenant", () => {
		for (const cuerpo of [...cuerposEspecial, ...cuerposPromo]) {
			for (const token of TOKENS_DEL_TENANT) {
				expect(cuerpo).not.toContain(token);
			}
		}
	});

	it("declaran sus colores con tokens fijos y propios", () => {
		for (const cuerpo of cuerposEspecial) {
			expect(cuerpo).toContain("--badge-special-bg");
			expect(cuerpo).toContain("--badge-special-fg");
		}
		for (const cuerpo of cuerposPromo) {
			expect(cuerpo).toContain("--badge-promo-bg");
			expect(cuerpo).toContain("--badge-promo-fg");
		}
	});
});
