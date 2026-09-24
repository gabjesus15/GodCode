import { describe, expect, it } from "vitest";

import { sanitizeAnalyticsPath } from "@/lib/analytics/sanitize-path";

describe("sanitizeAnalyticsPath", () => {
	it("quita el token del onboarding de la query y de la ruta", () => {
		expect(sanitizeAnalyticsPath("/onboarding/pago", "token=abc123&months=3")).toBe("/onboarding/pago?months=3");
		expect(sanitizeAnalyticsPath("/onboarding/verify/9f0c5a4e-1111-2222-3333-444455556666")).toBe("/onboarding/verify/[token]");
	});

	it("reemplaza identificadores largos y conserva el resto de la ruta", () => {
		expect(sanitizeAnalyticsPath("/companies/3c4e3b36-ce1d-4e8d-8c29-fda7eb990aec")).toBe("/companies/[id]");
		expect(sanitizeAnalyticsPath("/rica-pizza/menu", "categoria=pizzas")).toBe("/rica-pizza/menu?categoria=pizzas");
	});

	it("no deja correos ni referencias de pago", () => {
		expect(sanitizeAnalyticsPath("/checkout/success", "ref=5O190127TN364715T")).toBe("/checkout/success");
		expect(sanitizeAnalyticsPath("/onboarding/solicitudes", "search=ana%40mail.com")).toBe("/onboarding/solicitudes");
	});
});

describe("sanitizeAnalyticsPath con slugs largos", () => {
	it("no confunde el slug de un local con un token", () => {
		expect(sanitizeAnalyticsPath("/la-parada-de-maracaibo-2/menu")).toBe("/la-parada-de-maracaibo-2/menu");
		expect(sanitizeAnalyticsPath("/checkout/5O190127TN364715TABCDEFGH")).toBe("/checkout/[id]");
	});
});
