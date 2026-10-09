import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveSalesPanelUrl } from "@/lib/tenant/panel-url";

describe("enlace al panel CEO", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("con la variable del panel va ahí, y con `tab` directo a la sección", () => {
		vi.stubEnv("NEXT_PUBLIC_TENANT_PANEL_URL", "https://panel.example.com/");
		expect(resolveSalesPanelUrl("rica-pizza")).toBe("https://panel.example.com/");
		expect(resolveSalesPanelUrl("rica-pizza", { tab: "products" })).toBe("https://panel.example.com/admin?tab=products");
		expect(resolveSalesPanelUrl(null)).toBe("https://panel.example.com/");
	});

	it("sin la variable, al login del subdominio de la tienda", () => {
		vi.stubEnv("NEXT_PUBLIC_TENANT_PANEL_URL", "");
		vi.stubEnv("NEXT_PUBLIC_TENANT_BASE_DOMAIN", "example.com");
		vi.stubEnv("NEXT_PUBLIC_TENANT_PROTOCOL", "https");
		expect(resolveSalesPanelUrl("rica-pizza", { tab: "products" })).toBe("https://rica-pizza.example.com/login");
	});

	it("sin variable ni tienda no hay a dónde mandar", () => {
		vi.stubEnv("NEXT_PUBLIC_TENANT_PANEL_URL", "");
		expect(resolveSalesPanelUrl(null)).toBe("");
	});
});
