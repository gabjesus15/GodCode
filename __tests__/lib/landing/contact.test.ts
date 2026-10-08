import { describe, expect, it } from "vitest";

import {
	getLandingOrganizationSameAs,
	getLandingSocialLinksFromEnv,
	LANDING_LINKEDIN_URL_DEFAULT,
	LANDING_POS_WHATSAPP_GREETING,
	normalizeLinkedInUrl,
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
