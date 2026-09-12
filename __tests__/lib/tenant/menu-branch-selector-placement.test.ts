import { describe, expect, it } from "vitest";

import { NAVBAR_TYPES, PRODUCT_CARD_STYLES } from "@/lib/store-theme/theme-config";
import {
	resolveBranchSelectorPlacement,
	resolveMenuCartUiMode,
	shouldShowBottomNav,
} from "@/lib/tenant/menu/menu-helpers";

/**
 * El selector de sucursal se movio del header a la barra inferior cuando esa
 * barra esta a la vista, para que el nombre del local se quede con la linea
 * entera. Mover un control de sitio tiene dos formas de salir mal y ninguna da
 * error: que aparezca en los dos sitios a la vez, o en ninguno.
 *
 * El segundo caso es el grave. La barra inferior no siempre se monta:
 * `resolveMenuCartUiMode` devuelve "none" cuando no hay sucursal elegida, y con
 * ella se va el selector. Eso es aceptable SOLO porque en ese estado el modal
 * de sucursales se abre bloqueado y obliga a elegir, asi que el selector nunca
 * es la unica via — solo sirve para cambiar de local.
 *
 * Si alguien cambia `resolveMenuCartUiMode` y deja de montar la barra en algun
 * caso con sucursal ya elegida, el cliente se queda sin poder cambiarla y nada
 * falla: simplemente no hay boton. Por eso se fija aqui.
 */

const COMBINACIONES = PRODUCT_CARD_STYLES.flatMap((cardStyle) =>
	NAVBAR_TYPES.map((navbarType) => ({ cardStyle, navbarType })),
);

describe("colocacion del selector de sucursal", () => {
	it("cubre la matriz entera de estilos y navbars", () => {
		expect(COMBINACIONES.length).toBe(PRODUCT_CARD_STYLES.length * NAVBAR_TYPES.length);
		expect(COMBINACIONES.length).toBeGreaterThan(1);
	});

	it("sale en un sitio y solo en uno, en cualquier configuracion", () => {
		for (const { cardStyle, navbarType } of COMBINACIONES) {
			const barra = shouldShowBottomNav(cardStyle, navbarType);
			const sitio = resolveBranchSelectorPlacement(barra);

			const enNavbar = sitio === "navbar";
			const enBarra = sitio === "bottom-nav";

			expect(enNavbar !== enBarra).toBe(true);
			expect(enBarra).toBe(barra);
		}
	});

	/**
	 * La barra se monta con `mode` distinto de "none". Si el selector vive abajo,
	 * ese modo tiene que ser uno de los que la pintan.
	 */
	it("cuando vive abajo, la barra que lo aloja se monta de verdad", () => {
		const modosConBarra = new Set(["bottom-nav", "bottom-nav-only"]);

		for (const { cardStyle, navbarType } of COMBINACIONES) {
			const showBottomNav = shouldShowBottomNav(cardStyle, navbarType);
			if (resolveBranchSelectorPlacement(showBottomNav) !== "bottom-nav") continue;

			for (const onlineOrderingEnabled of [true, false, undefined]) {
				const mode = resolveMenuCartUiMode({
					hasBranch: true,
					onlineOrderingEnabled,
					showBottomNav,
				});
				expect(modosConBarra.has(mode)).toBe(true);
			}
		}
	});

	/**
	 * El unico hueco conocido: sin sucursal elegida no hay barra, asi que no hay
	 * selector. Se deja documentado en vez de silenciado — es la condicion de la
	 * que depende que mover el control fuese seguro, y si deja de cumplirse este
	 * test lo dice.
	 */
	it("sin sucursal elegida no hay barra, y por eso el modal se abre bloqueado", () => {
		for (const { cardStyle, navbarType } of COMBINACIONES) {
			const showBottomNav = shouldShowBottomNav(cardStyle, navbarType);
			const mode = resolveMenuCartUiMode({
				hasBranch: false,
				onlineOrderingEnabled: true,
				showBottomNav,
			});
			expect(mode).toBe("none");
		}
	});
});
