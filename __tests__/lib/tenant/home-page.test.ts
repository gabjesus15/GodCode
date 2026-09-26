import { describe, expect, it } from "vitest";

import {
	defaultHomePageConfig,
	normalizeHomePageConfig,
	parseBranchContactUrlInput,
	phoneToTelHref,
	readHomePageConfig,
	resolveHomeLinkIcon,
	sanitizeHomeUrl,
	socialInputToUrl,
} from "@/lib/tenant/home-page/home-page-config";
import { brandCoverFill, resolveHomePage, type ResolveHomePageInput } from "@/lib/tenant/home-page/resolve-home-page";

describe("sanitizeHomeUrl", () => {
	it("deja pasar http(s), mailto y tel", () => {
		expect(sanitizeHomeUrl("https://wa.me/56912345678")).toBe("https://wa.me/56912345678");
		expect(sanitizeHomeUrl("mailto:hola@local.cl")).toBe("mailto:hola@local.cl");
		expect(sanitizeHomeUrl("tel:+56912345678")).toBe("tel:+56912345678");
	});

	it("completa https en dominios sin esquema", () => {
		expect(sanitizeHomeUrl("instagram.com/rica")).toBe("https://instagram.com/rica");
		expect(sanitizeHomeUrl("www.local.cl")).toBe("https://www.local.cl/");
	});

	it("rechaza esquemas peligrosos y basura", () => {
		expect(sanitizeHomeUrl("javascript:alert(1)")).toBe("");
		expect(sanitizeHomeUrl("JaVaScRiPt:alert(1)")).toBe("");
		expect(sanitizeHomeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
		expect(sanitizeHomeUrl("/cuenta")).toBe("");
		expect(sanitizeHomeUrl("https://localhost")).toBe("");
		expect(sanitizeHomeUrl("hola mundo")).toBe("");
		expect(sanitizeHomeUrl("tel:abc")).toBe("");
		expect(sanitizeHomeUrl(null)).toBe("");
	});
});

describe("parseBranchContactUrlInput", () => {
	it("distingue no tocar, borrar y valor", () => {
		expect(parseBranchContactUrlInput(undefined)).toEqual({ ok: true, value: undefined });
		expect(parseBranchContactUrlInput("  ")).toEqual({ ok: true, value: null });
		expect(parseBranchContactUrlInput("wa.me/569")).toEqual({ ok: true, value: "https://wa.me/569" });
	});

	it("solo acepta direcciones web", () => {
		expect(parseBranchContactUrlInput("javascript:alert(1)").ok).toBe(false);
		expect(parseBranchContactUrlInput("mailto:a@b.cl").ok).toBe(false);
		expect(parseBranchContactUrlInput(42).ok).toBe(false);
	});
});

describe("socialInputToUrl y phoneToTelHref", () => {
	it("acepta usuarios sueltos", () => {
		expect(socialInputToUrl("instagram", "@rica.pizza")).toBe("https://instagram.com/rica.pizza");
		expect(socialInputToUrl("instagram", "rica_pizza")).toBe("https://instagram.com/rica_pizza");
		expect(socialInputToUrl("tiktok", "@rica")).toBe("https://www.tiktok.com/@rica");
		expect(socialInputToUrl("whatsapp", "+56 9 1234 5678")).toBe("https://wa.me/56912345678");
		expect(socialInputToUrl("email", "hola@rica.cl")).toBe("mailto:hola@rica.cl");
		expect(socialInputToUrl("website", "rica.cl")).toBe("https://rica.cl/");
	});

	it("convierte teléfonos escritos a mano", () => {
		expect(phoneToTelHref("+56 9 1234 5678")).toBe("tel:+56912345678");
		expect(phoneToTelHref("(0212) 555-1234")).toBe("tel:02125551234");
		expect(phoneToTelHref("123")).toBe("");
	});
});

describe("resolveHomeLinkIcon", () => {
	it("deduce el ícono del dominio", () => {
		expect(resolveHomeLinkIcon("auto", "https://www.pedidosya.cl/restaurantes/rica")).toBe("delivery");
		expect(resolveHomeLinkIcon("auto", "https://maps.app.goo.gl/abc")).toBe("location");
		expect(resolveHomeLinkIcon("auto", "https://www.tiktok.com/@rica")).toBe("tiktok");
		expect(resolveHomeLinkIcon("auto", "https://g.page/r/abc/review")).toBe("reviews");
		expect(resolveHomeLinkIcon("auto", "https://rica.cl")).toBe("link");
		expect(resolveHomeLinkIcon("gift", "https://rica.cl")).toBe("gift");
	});
});

describe("normalizeHomePageConfig", () => {
	it("sin config guardada reproduce la portada anterior", () => {
		const config = readHomePageConfig({ primaryColor: "#000" }, { schedule: "Pizzas a la leña\nLun a Vie 12-23" });
		expect(config.bio).toBe("Pizzas a la leña");
		expect(config.links.map((link) => [link.kind, link.enabled])).toEqual([
			["menu", true],
			["whatsapp", true],
			["instagram", true],
			["location", true],
			["phone", false],
		]);
		expect(config.links[0].featured).toBe(true);
	});

	it("lee theme_config guardado como texto JSON", () => {
		const config = readHomePageConfig(JSON.stringify({ homePage: { bio: "Hola", links: [] } }));
		expect(config.bio).toBe("Hola");
	});

	it("respeta el orden, repone integrados que falten y descarta lo inválido", () => {
		const config = normalizeHomePageConfig({
			bio: "  Sushi   de autor \n en Ñuñoa ",
			links: [
				{ id: "c_abcd1234", kind: "custom", label: "Reservas", url: "opentable.com/r/oishi", icon: "auto" },
				{ kind: "instagram", enabled: false },
				{ id: "c_evil0001", kind: "custom", label: "Premio", url: "javascript:alert(1)" },
				{ id: "c_nolabel1", kind: "custom", label: "", url: "https://oishi.cl" },
				{ kind: "instagram" },
				{ kind: "menu", label: "Carta", featured: true },
			],
			socials: [
				{ platform: "instagram", url: "@oishi" },
				{ platform: "instagram", url: "@otro" },
				{ platform: "myspace", url: "x" },
				{ platform: "tiktok", url: "javascript:1" },
			],
			buttonStyle: "neon",
			coverMode: "custom-image",
			coverImagePath: "",
		});

		expect(config.bio).toBe("Sushi de autor en Ñuñoa");
		expect(config.links.map((link) => link.id)).toEqual(["c_abcd1234", "instagram", "menu", "whatsapp", "location", "phone"]);
		expect(config.links[0].url).toBe("https://opentable.com/r/oishi");
		expect(config.links[1].enabled).toBe(false);
		expect(config.links[2]).toMatchObject({ label: "Carta", featured: true });
		expect(config.socials).toEqual([{ platform: "instagram", url: "https://instagram.com/oishi" }]);
		expect(config.buttonStyle).toBe("solid");
		// Sin foto propia subida no puede quedar en "custom-image".
		expect(config.coverMode).toBe("menu-image");
	});
});

function baseInput(overrides: Partial<ResolveHomePageInput> = {}): ResolveHomePageInput {
	return {
		config: defaultHomePageConfig(),
		theme: {
			primaryColor: "#c62828",
			hoverColor: "#ff2e40",
			backgroundColor: "#0a0a0a",
			surfaceScheme: "auto",
			backgroundMode: "image",
			brandNameColor: "",
			fontFamily: "montserrat",
		},
		name: "Rica Pizza",
		logoUrl: null,
		menuImageUrl: "https://example.supabase.co/storage/v1/object/sign/menu/bg.jpg",
		customCoverUrl: null,
		branches: [
			{ id: "1", name: "Centro", whatsapp_url: "https://wa.me/1", instagram_url: "javascript:alert(1)", map_url: "", phone: "+58 212 555 1234" },
			{ id: "2", name: "Este", whatsapp_url: "https://wa.me/2", instagram_url: "", map_url: "https://maps.app.goo.gl/x", phone: "" },
		],
		openBranchIds: ["2"],
		schedule: "Lun a Vie 12-23\nSáb 13-00",
		...overrides,
	};
}

describe("resolveHomePage", () => {
	it("agrupa sucursales, enlaza directo con una sola y oculta canales sin datos válidos", () => {
		const model = resolveHomePage(baseInput());
		const byId = Object.fromEntries(model.links.map((link) => [link.id, link]));

		expect(byId.menu).toMatchObject({ type: "menu", featured: true });
		expect(byId.whatsapp).toMatchObject({ type: "branches" });
		if (byId.whatsapp.type === "branches") {
			expect(byId.whatsapp.targets.map((target) => [target.branchName, target.isOpen])).toEqual([
				["Centro", false],
				["Este", true],
			]);
		}
		// El único Instagram guardado es un javascript: → el botón no existe.
		expect(byId.instagram).toBeUndefined();
		expect(byId.location).toMatchObject({ type: "href", href: "https://maps.app.goo.gl/x" });
		// Teléfono viene desactivado por defecto.
		expect(byId.phone).toBeUndefined();
	});

	it("calcula estado, esquema y colores legibles", () => {
		const model = resolveHomePage(baseInput());
		expect(model.status).toEqual({ open: 1, total: 2 });
		expect(model.scheme).toBe("dark");
		expect(model.brand.onAccent).toBe("#ffffff");
		expect(model.schedule).toEqual([]);

		const light = resolveHomePage(
			baseInput({
				theme: { ...baseInput().theme, primaryColor: "#ffd600", backgroundColor: "#ffffff", brandNameColor: "" },
				config: { ...defaultHomePageConfig(), showSchedule: true, showStatus: false },
			}),
		);
		expect(light.scheme).toBe("light");
		// Amarillo: el texto encima va oscuro y el nombre cede a la tinta (no se lee sobre claro).
		expect(light.brand.onAccent).toBe("#141414");
		expect(light.brand.nameColor).toBeNull();
		expect(light.schedule).toEqual(["Lun a Vie 12-23", "Sáb 13-00"]);
		expect(light.status).toBeNull();
	});

	it("elige la portada según el modo y los datos disponibles", () => {
		expect(resolveHomePage(baseInput()).cover).toMatchObject({ kind: "image" });
		expect(resolveHomePage(baseInput({ menuImageUrl: null })).cover).toEqual({ kind: "brand" });
		expect(
			resolveHomePage(baseInput({ theme: { ...baseInput().theme, backgroundMode: "solid" } })).cover,
		).toEqual({ kind: "brand" });
		expect(
			resolveHomePage(baseInput({ config: { ...defaultHomePageConfig(), coverMode: "none" } })).cover,
		).toEqual({ kind: "none" });
	});

	it("en fondo sólido usa el color del menú como telón y el hover más vivo como brillo", () => {
		const solid = resolveHomePage(
			baseInput({ theme: { ...baseInput().theme, backgroundMode: "solid", backgroundColor: "#e2e2e2", surfaceScheme: "light" } }),
		);
		expect(solid.brand.page).toBe("#e2e2e2");
		expect(solid.brand.glow).toBe("#ff2e40");

		// Con foto de fondo (o un velo translúcido) no hay color liso que usar.
		expect(resolveHomePage(baseInput()).brand.page).toBeNull();
		expect(
			resolveHomePage(baseInput({ theme: { ...baseInput().theme, backgroundMode: "solid", backgroundColor: "rgba(0, 0, 0, 0.3)" } }))
				.brand.page,
		).toBeNull();

		// Un hover más oscuro que el primario no sirve de brillo: se aclara el acento.
		const darkHover = resolveHomePage(baseInput({ theme: { ...baseInput().theme, hoverColor: "#300000" } }));
		expect(darkHover.brand.glow).not.toBe("#300000");
		expect(brandCoverFill(darkHover.brand.accent, darkHover.brand.glow)).toContain("radial-gradient");
	});

	it("sin datos de caja no inventa un estado", () => {
		const model = resolveHomePage(baseInput({ openBranchIds: null }));
		expect(model.status).toBeNull();
	});
});
