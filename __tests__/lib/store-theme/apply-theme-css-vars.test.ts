import { describe, expect, it } from "vitest";

import { buildTenantThemeCssString } from "@/lib/store-theme/apply-theme-css-vars";

describe("apply-theme-css-vars", () => {
	it("builds css with html/body and shadow vars", () => {
		const css = buildTenantThemeCssString({
			primaryColor: "#ff0000",
			backgroundColor: "#0a0a0a",
		});
		expect(css).toContain("html, body");
		expect(css).toContain("--accent-shadow");
		expect(css).toContain("--card-border");
		expect(css).toContain("#ff0000");
		expect(css).toContain("--tenant-bg-image:none");
		expect(css).toContain("--tenant-bg-layer-opacity:0");
		expect(css).not.toContain("menu-pattern");
	});

	/**
	 * El fondo se escalaba a un mosaico de 1200px con `repeat`, que solo funciona
	 * si la imagen subida es una textura sin costuras. En un fondo real medido, la
	 * diferencia entre el borde izquierdo y el derecho era 59 frente a 53 entre dos
	 * columnas interiores: los bordes casaban peor que dos trozos no relacionados,
	 * y se veian lineas verticales con el dibujo cortado.
	 *
	 * La capa que lo pinta es fija y del tamano del viewport, asi que no necesita
	 * repetirse: con `cover` una sola copia la llena y no hay union visible.
	 */
	it("escala el fondo del tenant con cover, sin repetirlo", () => {
		const css = buildTenantThemeCssString({
			backgroundImageUrl: "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/bg.jpg",
		});
		expect(css).toContain("--tenant-bg-layer-opacity:0.38");
		expect(css).toContain("--tenant-bg-size:cover");
		expect(css).toContain("--tenant-bg-repeat:no-repeat");
		expect(css).toContain("brightness(0.46)");
		expect(css).not.toContain("menu-pattern");
	});

	/**
	 * Este test nacio para fijar que quitar el tint no cambiase el tamano del
	 * fondo. Fijaba el literal `1200px`, que era un proxy del invariante real;
	 * ahora compara los dos modos entre si, que es lo que de verdad importa y no
	 * se rompe al cambiar la estrategia de escalado.
	 */
	it("mantiene el mismo encuadre del fondo con y sin tint de color", () => {
		const imagen = "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/bg.jpg";
		const conTint = buildTenantThemeCssString({ backgroundImageUrl: imagen });
		const sinTint = buildTenantThemeCssString({
			backgroundColor: "rgba(10, 10, 10, 0)",
			backgroundImageUrl: imagen,
		});

		const tamano = (css: string) => /--tenant-bg-size:([^;]+);/.exec(css)?.[1];
		const repeticion = (css: string) => /--tenant-bg-repeat:([^;]+);/.exec(css)?.[1];

		expect(tamano(sinTint)).toBe(tamano(conTint));
		expect(repeticion(sinTint)).toBe(repeticion(conTint));
		expect(sinTint).toContain("--tenant-bg-layer-opacity:1");
		expect(sinTint).toContain("brightness(1)");
	});

	it("applies custom background brightness", () => {
		const css = buildTenantThemeCssString({
			backgroundColor: "rgba(10, 10, 10, 0)",
			backgroundBrightness: 1.25,
			backgroundImageUrl: "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/bg.jpg",
		});
		expect(css).toContain("brightness(1.25)");
	});

	/**
	 * El tinte del fondo era un escalon, no una rampa: por debajo de alfa 0.08 la
	 * capa de imagen iba al 100% sin oscurecer, y a partir de 0.09 saltaba de golpe
	 * al 38% con brillo 0.46, desenfoque y contraste. Mover el deslizador un 1%
	 * cambiaba tres cosas a la vez, y el resto de su recorrido no cambiaba ninguna.
	 *
	 * Estos tests fijan que el control responda de forma continua y monotona. Si
	 * alguien vuelve a meter un umbral, el salto lo delata aqui.
	 */
	describe("rampa del tinte", () => {
		const imagen = "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/bg.jpg";
		const capaPara = (alpha: number) => {
			const css = buildTenantThemeCssString({
				backgroundColor: `rgba(10, 10, 10, ${alpha})`,
				backgroundImageUrl: imagen,
			});
			const capa = Number(/--tenant-bg-layer-opacity:([\d.]+)/.exec(css)?.[1]);
			const brillo = Number(/brightness\(([\d.]+)\)/.exec(css)?.[1]);
			return { capa, brillo };
		};

		it("no da ningun salto brusco entre un paso y el siguiente", () => {
			const pasos = Array.from({ length: 21 }, (_, i) => i / 20);
			let anterior = capaPara(pasos[0]);

			for (const alpha of pasos.slice(1)) {
				const actual = capaPara(alpha);
				// Un paso del 5% no puede mover la capa mas de lo que mueve el recorrido
				// entero repartido, con holgura: cualquier umbral rompe esto.
				expect(Math.abs(actual.capa - anterior.capa)).toBeLessThan(0.1);
				expect(Math.abs(actual.brillo - anterior.brillo)).toBeLessThan(0.1);
				anterior = actual;
			}
		});

		it("avanza de forma monotona: mas tinte nunca muestra mas imagen", () => {
			const pasos = Array.from({ length: 11 }, (_, i) => i / 10);
			const capas = pasos.map((a) => capaPara(a).capa);

			for (let i = 1; i < capas.length; i++) {
				expect(capas[i]).toBeLessThanOrEqual(capas[i - 1]);
			}
		});

		it("conserva los dos extremos que ya usaban los tenants", () => {
			expect(capaPara(0).capa).toBe(1);
			expect(capaPara(0).brillo).toBe(1);
			expect(capaPara(1).capa).toBe(0.38);
			expect(capaPara(1).brillo).toBe(0.46);
		});
	});

	it("preserves background color opacity as rgba", () => {
		const faded = buildTenantThemeCssString({
			backgroundColor: "rgba(10, 10, 10, 0.4)",
		});
		expect(faded).toContain("rgba(10, 10, 10, 0.4)");

		const clear = buildTenantThemeCssString({
			backgroundColor: "rgba(10, 10, 10, 0)",
		});
		expect(clear).toContain("rgba(10, 10, 10, 0)");
		expect(clear).toContain("--bg-primary:rgba(10, 10, 10, 0)");
	});
});
