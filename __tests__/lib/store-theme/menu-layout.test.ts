import { describe, expect, it } from "vitest";

import { normalizeMenuLayout, normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";

describe("normalizeMenuLayout", () => {
	it("sin nada usa barra, destacados como categoría y botón de carrito", () => {
		expect(normalizeMenuLayout(undefined)).toEqual({
			headerStyle: "bar",
			featuredStyle: "section",
			cartStyle: "float",
			coverImageUrl: "",
		});
	});

	it("respeta las piezas válidas y descarta las desconocidas", () => {
		expect(normalizeMenuLayout({ headerStyle: "cover", featuredStyle: "carousel", cartStyle: "bar" })).toMatchObject({
			headerStyle: "cover",
			featuredStyle: "carousel",
			cartStyle: "bar",
		});
		expect(normalizeMenuLayout({ headerStyle: "hero", featuredStyle: 3, cartStyle: "" })).toMatchObject({
			headerStyle: "bar",
			featuredStyle: "section",
			cartStyle: "float",
		});
	});

	it("la portada usa la imagen de fondo si no hay una propia", () => {
		expect(normalizeMenuLayout({ backgroundImageUrl: " https://cdn.example/fondo.jpg " }).coverImageUrl).toBe(
			"https://cdn.example/fondo.jpg",
		);
		expect(
			normalizeMenuLayout({ coverImageUrl: "https://cdn.example/portada.jpg", backgroundImageUrl: "x" }).coverImageUrl,
		).toBe("https://cdn.example/portada.jpg");
	});

	it("el tema normalizado lleva las tres piezas", () => {
		const theme = normalizeStoreThemeConfig({ headerStyle: "cover", cartStyle: "bar" });
		expect(theme.headerStyle).toBe("cover");
		expect(theme.featuredStyle).toBe("section");
		expect(theme.cartStyle).toBe("bar");
	});
});
