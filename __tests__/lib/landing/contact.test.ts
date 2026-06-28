import { describe, expect, it } from "vitest";

import { getLandingSocialLinks } from "@/lib/landing/contact";

describe("getLandingSocialLinks", () => {
	it("normaliza usuario de Instagram y número de WhatsApp", () => {
		process.env.NEXT_PUBLIC_LANDING_INSTAGRAM_URL = "@gcode.cl";
		process.env.NEXT_PUBLIC_LANDING_WHATSAPP_URL = "+56912345678";
		process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "hola@gcode.me";

		const links = getLandingSocialLinks();

		expect(links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: "instagram",
					href: "https://instagram.com/gcode.cl",
					display: "@gcode.cl",
				}),
				expect.objectContaining({
					kind: "whatsapp",
					href: "https://wa.me/56912345678",
				}),
				expect.objectContaining({
					kind: "email",
					href: "mailto:hola@gcode.me",
				}),
			]),
		);
	});
});
