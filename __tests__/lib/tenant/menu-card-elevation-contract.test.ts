import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Una sombra de tarjeta tiene un trabajo: separar esa tarjeta de lo que hay
 * detras. Deja de hacerlo en cuanto se sale mas de media calle del grid,
 * porque entonces se junta con la de la tarjeta vecina y las dos se leen como
 * una sola mancha bajo toda la parrilla.
 *
 * Seis de los nueve estilos definian la sombra sin `spread` negativo. Una
 * `0 8px 32px 0` se extiende 16px hacia cada lado (blur / 2), pero la calle
 * mas estrecha mide 12px: las dos vecinas metian 16px cada una en un hueco de
 * 12 y la sombra seguia 4px por debajo de la tarjeta de al lado.
 *
 * Nada falla visiblemente si esto se rompe otra vez — la pagina carga igual —,
 * solo se emborrona. Por eso se fija la regla geometrica aqui en vez de los
 * valores concretos: el alcance lateral se puede recalcular, la escala se
 * puede reajustar, pero ninguna sombra de tarjeta puede invadir al vecino.
 */

const STYLES_DIR = join(process.cwd(), "app", "[subdomain]", "styles");

const cardCss = readFileSync(join(STYLES_DIR, "ProductCard.css"), "utf8");
const layoutsCss = readFileSync(join(STYLES_DIR, "ProductCardLayouts.css"), "utf8");

/** La calle mas apretada de todas las parrillas: Cristal y Barra lateral en movil. */
const CALLE_MAS_ESTRECHA_PX = 12;
const MARGEN_LATERAL_PX = CALLE_MAS_ESTRECHA_PX / 2;

/**
 * Cuanto se sale una capa de sombra por cada borde.
 *
 * En CSS el desenfoque se reparte a los dos lados del borde de la sombra, asi
 * que el alcance util es `blur / 2 + spread`; el desplazamiento vertical lo
 * resta por arriba y lo suma por abajo.
 */
function alcance(capa: string): { lateral: number; arriba: number } {
	// El color va primero fuera: `rgba(0, 0, 0, 0.45)` aporta cuatro numeros que
	// no son longitudes. Y el desplazamiento horizontal se escribe `0` a secas,
	// sin unidad, asi que la unidad tiene que ser opcional al leerlo.
	const sinColor = capa.replace(/(?:rgba?|hsla?)\([^)]*\)/gi, " ").replace(/#[0-9a-fA-F]{3,8}/g, " ");
	const longitudes = [...sinColor.matchAll(/(-?\d*\.?\d+)(?:px)?/g)].map((m) => Number(m[1]));
	const [, y = 0, blur = 0, spread = 0] = longitudes;
	const lateral = blur / 2 + spread;
	return { lateral, arriba: lateral - y };
}

function capasDe(valor: string): string[] {
	// Corta por comas que no esten dentro de un rgba(...).
	return valor
		.split(/,(?![^(]*\))/)
		.map((c) => c.trim())
		.filter((c) => c.length > 0 && !c.includes("inset"));
}

describe("contrato de elevacion de las tarjetas", () => {
	const escala = /--card-elev-(rest|hover):([^;]+);/g;
	const niveles = [...cardCss.matchAll(escala)].map(([, nombre, valor]) => ({ nombre, valor }));

	it("define los dos niveles de la escala una sola vez", () => {
		expect(niveles.map((n) => n.nombre).sort()).toEqual(["hover", "rest"]);
	});

	it.each(["rest", "hover"])("la escala '%s' cabe en la calle mas estrecha", (nombre) => {
		const nivel = niveles.find((n) => n.nombre === nombre);
		expect(nivel).toBeDefined();

		for (const capa of capasDe(nivel!.valor)) {
			expect(alcance(capa).lateral).toBeLessThanOrEqual(MARGEN_LATERAL_PX);
		}
	});

	it.each(["rest", "hover"])("la escala '%s' no asoma por encima de la tarjeta", (nombre) => {
		// Una sombra que rodea el objeto por los cuatro lados se lee como
		// resplandor, no como elevacion: la luz viene de arriba.
		const nivel = niveles.find((n) => n.nombre === nombre);

		for (const capa of capasDe(nivel!.valor)) {
			expect(alcance(capa).arriba).toBeLessThanOrEqual(0);
		}
	});

	/**
	 * Food no puede usar la escala: su contenedor es transparente y la tarjeta
	 * visible es un hijo, asi que la elevacion la pone `filter: drop-shadow`,
	 * que no admite `spread`. Queda fuera del token, pero no fuera de la regla.
	 */
	it.each(["reposo", "hover"])("la sombra de Food en %s respeta la misma silueta", (estado) => {
		// El color lleva sus propios parentesis — `rgba(...)` —, asi que la captura
		// tiene que ser perezosa hasta el `);` final y no cortar en el primero.
		const filtros = [...layoutsCss.matchAll(/filter: drop-shadow\((.+?)\);/g)].map((m) => m[1]);
		expect(filtros).toHaveLength(2);

		const { lateral, arriba } = alcance(filtros[estado === "reposo" ? 0 : 1]);
		expect(lateral).toBeLessThanOrEqual(MARGEN_LATERAL_PX);
		expect(arriba).toBeLessThanOrEqual(0);
	});

	it("ningun estilo de tarjeta se inventa su propia sombra", () => {
		// Los nueve contenedores de tarjeta, con su estado de hover. Si alguien
		// anade un estilo nuevo con sombra propia, aparece aqui.
		const contenedores = /^\.product-(?:layout-[a-z]+|card)(?:[.:][a-z-]+)*\s*\{([^}]*)\}/gm;
		const propias: string[] = [];

		for (const css of [cardCss, layoutsCss]) {
			for (const [regla, cuerpo] of [...css.matchAll(contenedores)].map((m) => [m[0], m[1]])) {
				const declaracion = /box-shadow:([^;]+);/.exec(cuerpo);
				if (!declaracion) continue;
				const fuera = capasDe(declaracion[1]);
				if (fuera.length > 0 && !fuera.some((c) => c.includes("--card-elev-"))) {
					propias.push(regla.slice(0, regla.indexOf("{")).trim());
				}
			}
		}

		expect(propias).toEqual([]);
	});
});
