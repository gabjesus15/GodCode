import { describe, expect, it } from "vitest";

import { labelForBudget, labelForProjectType, parseQuoteRequest } from "@/lib/labs/quote-request";

const valid = {
	name: "Ana Pérez",
	company: "Panadería Central",
	email: "ana@example.com",
	phone: "+56 9 1234 5678",
	projectType: "sitio-web",
	budget: "1000-3000",
	message: "Necesitamos una web nueva con catálogo y formulario de pedidos para fin de año.",
};

describe("parseQuoteRequest", () => {
	it("acepta una solicitud completa y normaliza espacios", () => {
		const result = parseQuoteRequest({ ...valid, name: "  Ana Pérez  " });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.name).toBe("Ana Pérez");
		expect(result.value.projectType).toBe("sitio-web");
		expect(result.value.budget).toBe("1000-3000");
	});

	it("acepta sin teléfono ni presupuesto", () => {
		const result = parseQuoteRequest({ ...valid, phone: "", budget: "" });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.phone).toBeNull();
		expect(result.value.budget).toBe("");
	});

	it("rechaza el campo trampa relleno sin delatar el motivo", () => {
		const result = parseQuoteRequest({ ...valid, website: "http://spam.example" });
		expect(result.ok).toBe(false);
	});

	it.each([
		["name", { name: "A" }],
		["company", { company: "" }],
		["email", { email: "no-es-correo" }],
		["phone", { phone: "abc" }],
		["projectType", { projectType: "drones" }],
		["budget", { budget: "1" }],
		["message", { message: "corto" }],
	])("señala el campo %s cuando es inválido", (field, patch) => {
		const result = parseQuoteRequest({ ...valid, ...patch });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.field).toBe(field);
		expect(result.error.length).toBeGreaterThan(5);
	});

	it("rechaza cuerpos que no son objetos", () => {
		expect(parseQuoteRequest(null).ok).toBe(false);
		expect(parseQuoteRequest("hola").ok).toBe(false);
	});
});

describe("etiquetas", () => {
	it("traduce valores a texto legible", () => {
		expect(labelForProjectType("sistema")).toBe("Sistema a medida");
		expect(labelForBudget("")).toContain("Prefiero");
		expect(labelForBudget("mas-8000")).toContain("8.000");
	});
});
