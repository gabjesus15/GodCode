import { describe, expect, it } from "vitest";

import { cleanMultilineText, cleanPlainText } from "@/lib/infra/server-sanitize";

describe("cleanMultilineText", () => {
	it("guarda texto plano, sin entidades HTML (React ya escapa al pintar)", () => {
		expect(cleanMultilineText("¿Pueden subir el plan? <urgente> O'Higgins & Co")).toBe(
			"¿Pueden subir el plan? <urgente> O'Higgins & Co",
		);
	});

	it("conserva los saltos de línea y quita el exceso", () => {
		expect(cleanMultilineText("Hola\r\n\r\n\r\n\r\nNecesito ayuda   con   el pago\n  gracias  ")).toBe(
			"Hola\n\nNecesito ayuda con el pago\ngracias",
		);
	});

	it("quita caracteres invisibles y respeta el largo máximo", () => {
		const zeroWidth = String.fromCharCode(0x200b);
		expect(cleanMultilineText(`a${zeroWidth}b`)).toBe("a b");
		expect(cleanMultilineText("x".repeat(20), 5)).toBe("xxxxx");
		expect(cleanMultilineText(null)).toBe("");
	});
});

describe("cleanPlainText", () => {
	it("colapsa todo a una línea", () => {
		expect(cleanPlainText("  Rica\n pizza  ")).toBe("Rica pizza");
	});
});
