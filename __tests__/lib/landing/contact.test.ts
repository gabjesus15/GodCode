import { describe, expect, it } from "vitest";

import {
	getLandingOrganizationSameAs,
	getLandingSocialLinksFromEnv,
	LANDING_LINKEDIN_URL_DEFAULT,
	LANDING_POS_WHATSAPP_GREETING,
	landingSocialLinksWithGreeting,
	normalizeLinkedInUrl,
	normalizeWhatsAppUrl,
	whatsappDisplay,
	withWhatsAppText,
} from "@/lib/landing/contact";

describe("withWhatsAppText", () => {
	const query = `text=${encodeURIComponent(LANDING_POS_WHATSAPP_GREETING)}`;

	it("abre el chat con el saludo ya escrito", () => {
		expect(withWhatsAppText("https://wa.me/56912345678", LANDING_POS_WHATSAPP_GREETING)).toBe(
			`https://wa.me/56912345678?${query}`,
		);
		expect(withWhatsAppText("https://api.whatsapp.com/send?phone=56912345678", LANDING_POS_WHATSAPP_GREETING)).toBe(
			`https://api.whatsapp.com/send?phone=56912345678&${query}`,
		);
	});

	it("respeta un texto propio y no toca enlaces que no son de WhatsApp", () => {
		expect(withWhatsAppText("https://wa.me/56912345678?text=Hola", "Otro")).toBe("https://wa.me/56912345678?text=Hola");
		expect(withWhatsAppText("https://wa.link/abc123", "Hola")).toBe("https://wa.link/abc123");
		expect(withWhatsAppText("no es una url", "Hola")).toBe("no es una url");
	});

	it("el número que se muestra no cambia por el saludo", () => {
		expect(whatsappDisplay(withWhatsAppText("https://wa.me/56912345678", "Hola"))).toBe(
			whatsappDisplay("https://wa.me/56912345678"),
		);
	});
});

describe("landingSocialLinksWithGreeting", () => {
	const links = [
		{ kind: "whatsapp" as const, href: "https://wa.me/56912345678", label: "WhatsApp de Gcode", display: "+56912345678" },
		{ kind: "email" as const, href: "mailto:hola@example.com", label: "Email de contacto", display: "hola@example.com" },
	];

	it("saluda en el WhatsApp de ventas y deja el resto igual", () => {
		const greeted = landingSocialLinksWithGreeting(links);
		expect(greeted[0]?.href).toBe(`https://wa.me/56912345678?text=${encodeURIComponent(LANDING_POS_WHATSAPP_GREETING)}`);
		expect(greeted[1]).toEqual(links[1]);
		// Un saludo propio (la home de Gcode Labs) reemplaza al de ventas.
		expect(landingSocialLinksWithGreeting(links, "Hola Labs")[0]?.href).toBe("https://wa.me/56912345678?text=Hola%20Labs");
	});
});

describe("normalizeWhatsAppUrl", () => {
	it("convierte un número en wa.me con la misma regla que los negocios y respeta un enlace completo", () => {
		expect(normalizeWhatsAppUrl("+56 9 1234 5678")).toBe("https://wa.me/56912345678");
		expect(normalizeWhatsAppUrl("https://wa.me/56912345678?text=Hola")).toBe("https://wa.me/56912345678?text=Hola");
		expect(normalizeWhatsAppUrl("1234567")).toBeNull();
		expect(normalizeWhatsAppUrl("1234567890123456")).toBeNull();
		expect(normalizeWhatsAppUrl("  ")).toBeNull();
	});
});

describe("normalizeLinkedInUrl", () => {
	it("acepta URL completa o slug de página de empresa", () => {
		expect(normalizeLinkedInUrl("https://www.linkedin.com/company/gcode-labs/")).toBe(
			"https://www.linkedin.com/company/gcode-labs/",
		);
		expect(normalizeLinkedInUrl("gcode-labs")).toBe("https://www.linkedin.com/company/gcode-labs/");
		expect(normalizeLinkedInUrl("linkedin.com/company/gcode-labs")).toBe(
			"https://www.linkedin.com/company/gcode-labs/",
		);
		expect(normalizeLinkedInUrl("  ")).toBeNull();
		expect(normalizeLinkedInUrl("slug con espacios")).toBeNull();
	});
});

describe("getLandingOrganizationSameAs", () => {
	it("incluye la página de empresa en LinkedIn por defecto", () => {
		delete process.env.NEXT_PUBLIC_LANDING_LINKEDIN_URL;
		expect(getLandingOrganizationSameAs()).toContain(LANDING_LINKEDIN_URL_DEFAULT);
	});
});

describe("getLandingSocialLinksFromEnv", () => {
	it("normaliza usuario de Instagram y número de WhatsApp", () => {
		process.env.NEXT_PUBLIC_LANDING_INSTAGRAM_URL = "@gcode.cl";
		process.env.NEXT_PUBLIC_LANDING_WHATSAPP_URL = "+56912345678";
		process.env.NEXT_PUBLIC_LANDING_LINKEDIN_URL = "gcode-labs";
		process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "godcode.administrativo@gmail.com";

		const links = getLandingSocialLinksFromEnv();

		expect(links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: "instagram",
					href: "https://instagram.com/gcode.cl",
					display: "@gcode.cl",
				}),
				expect.objectContaining({
					kind: "linkedin",
					href: "https://www.linkedin.com/company/gcode-labs/",
					display: "LinkedIn",
				}),
				expect.objectContaining({
					kind: "whatsapp",
					href: "https://wa.me/56912345678",
				}),
				expect.objectContaining({
					kind: "email",
					href: "mailto:godcode.administrativo@gmail.com",
				}),
			]),
		);
	});
});
