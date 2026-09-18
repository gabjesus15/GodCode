import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const company = { id: "company-a", countryCode: "CL" };

describe("documentRateKey", () => {
	it("da la misma clave para cualquier formato del mismo documento", async () => {
		const { documentRateKey } = await import("@/lib/menu-account/route-helpers");
		const keys = ["12.345.678-5", "12345678-5", "123456785", " 012.345.678-5 "].map((doc) =>
			documentRateKey(company, doc),
		);
		expect(new Set(keys).size).toBe(1);
	});

	it("separa documentos distintos y negocios distintos", async () => {
		const { documentRateKey } = await import("@/lib/menu-account/route-helpers");
		const base = documentRateKey(company, "12.345.678-5");
		expect(documentRateKey(company, "12.674.885-K")).not.toBe(base);
		expect(documentRateKey({ ...company, id: "company-b" }, "12.345.678-5")).not.toBe(base);
	});

	it("un documento inválido también se agrupa ignorando separadores", async () => {
		const { documentRateKey } = await import("@/lib/menu-account/route-helpers");
		expect(documentRateKey(company, "12.345.678-9")).toBe(documentRateKey(company, "123456789"));
	});

	it("no deja el documento en claro en la clave", async () => {
		const { documentRateKey } = await import("@/lib/menu-account/route-helpers");
		expect(documentRateKey(company, "12.345.678-5")).not.toContain("12345678");
	});
});

describe("menuAccountDisabledResponse", () => {
	const original = process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED;

	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		if (original === undefined) delete process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED;
		else process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED = original;
	});

	it("responde 404 con el flag apagado: la API no debe quedar abierta", async () => {
		delete process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED;
		const { menuAccountDisabledResponse } = await import("@/lib/menu-account/route-helpers");
		const response = menuAccountDisabledResponse();
		expect(response?.status).toBe(404);
	});

	it("deja pasar con el flag encendido", async () => {
		process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED = "1";
		const { menuAccountDisabledResponse } = await import("@/lib/menu-account/route-helpers");
		expect(menuAccountDisabledResponse()).toBeNull();
	});
});
