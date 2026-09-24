import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

describe("serializeJsonLd", () => {
	it("no deja cerrar la etiqueta script con datos del tenant", () => {
		const out = serializeJsonLd({ name: "Pizza</script><script>alert(1)</script>" });
		expect(out).not.toContain("</script>");
		expect(out).not.toContain("<");
	});

	it("conserva el valor al parsearlo", () => {
		const data = { name: "Dulce & Salado <3>", note: `línea${LINE_SEPARATOR}otra${PARAGRAPH_SEPARATOR}fin` };
		const out = serializeJsonLd(data);
		expect(out).not.toContain(LINE_SEPARATOR);
		expect(out).not.toContain(PARAGRAPH_SEPARATOR);
		expect(JSON.parse(out)).toEqual(data);
	});
});
