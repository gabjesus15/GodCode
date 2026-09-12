import { describe, expect, it } from "vitest";

import { escapeLikePattern } from "@/lib/db/like-pattern";

describe("escapeLikePattern", () => {
	it("deja intacto un valor sin metacaracteres", () => {
		expect(escapeLikePattern("juan@empresa.com")).toBe("juan@empresa.com");
	});

	it("escapa el guion bajo, que es comodín de un carácter", () => {
		expect(escapeLikePattern("a_b")).toBe("a\\_b");
	});

	it("escapa el porcentaje, que es comodín de cualquier cadena", () => {
		// Sin esto, `?q=%` devuelve la tabla entera.
		expect(escapeLikePattern("%")).toBe("\\%");
	});

	it("escapa la barra invertida primero, sin duplicar los escapes que introduce", () => {
		// La trampa clásica: si `\` se escapa al final, se re-escapan las barras
		// que acaban de insertar los pasos de `%` y `_`.
		expect(escapeLikePattern("\\")).toBe("\\\\");
		expect(escapeLikePattern("\\_")).toBe("\\\\\\_");
		expect(escapeLikePattern("a\\%b")).toBe("a\\\\\\%b");
	});

	it("elimina el asterisco en vez de escaparlo", () => {
		// PostgREST acepta `*` como alias de `%` y lo sustituye en el servidor,
		// antes de que Postgres vea el patrón: `\*` llegaría como `\%`, un
		// porcentaje literal, no un asterisco literal. No hay forma de escaparlo.
		expect(escapeLikePattern("*")).toBe("");
		expect(escapeLikePattern("a*b")).toBe("ab");
	});

	it("maneja combinaciones de todos los metacaracteres", () => {
		expect(escapeLikePattern("%_*\\")).toBe("\\%\\_\\\\");
	});

	it("no altera una cadena vacía", () => {
		expect(escapeLikePattern("")).toBe("");
	});
});
