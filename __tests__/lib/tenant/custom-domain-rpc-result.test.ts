import { describe, expect, it } from "vitest";

import { slugFromRpcResult } from "@/lib/tenant/custom-domain-resolve";

describe("slugFromRpcResult", () => {
	it("acepta el texto que devuelve la función nueva", () => {
		expect(slugFromRpcResult("rica-pizza")).toBe("rica-pizza");
		expect(slugFromRpcResult("  oishi-sushi ")).toBe("oishi-sushi");
	});

	it("acepta la tabla que devolvía la versión anterior", () => {
		expect(slugFromRpcResult([{ public_slug: "rica-pizza" }])).toBe("rica-pizza");
		expect(slugFromRpcResult({ public_slug: "rica-pizza" })).toBe("rica-pizza");
	});

	it("sin dominio registrado no devuelve nada", () => {
		expect(slugFromRpcResult(null)).toBeNull();
		expect(slugFromRpcResult([])).toBeNull();
		expect(slugFromRpcResult("")).toBeNull();
		expect(slugFromRpcResult([{ public_slug: null }])).toBeNull();
	});
});
