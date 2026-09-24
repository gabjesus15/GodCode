import { describe, expect, it } from "vitest";

import {
	pickPublicPaymentConfig,
	sanitizeBranchPaymentConfig,
	sanitizeBranchPaymentMethods,
} from "@/lib/payments/branch-payment-config";

describe("pickPublicPaymentConfig", () => {
	it("descarta credenciales guardadas por formularios anteriores", () => {
		expect(
			pickPublicPaymentConfig("paypal", { client_id: "abc", client_secret: "shh", email: "caja@local.cl" }),
		).toEqual({ email: "caja@local.cl" });
		expect(pickPublicPaymentConfig("mercadopago", JSON.stringify({ access_token: "APP_USR-x", public_key: "y" }))).toBeNull();
	});

	it("Stripe y columnas desconocidas no conservan nada", () => {
		expect(pickPublicPaymentConfig("stripe", { publishable_key: "pk", secret_key: "sk" })).toBeNull();
		expect(pickPublicPaymentConfig("otro", { email: "x@y.z" })).toBeNull();
	});

	it("recorta valores y omite los vacíos", () => {
		expect(pickPublicPaymentConfig("zelle", { email: "  pagos@x.com ", name: "   " })).toEqual({ email: "pagos@x.com" });
	});
});

describe("sanitizeBranchPaymentConfig", () => {
	it("conserva el formato de cada columna y quita Stripe de los métodos", () => {
		const branch = {
			id: "b1",
			payment_methods: ["efectivo", "stripe", "paypal", "paypal"],
			paypal: JSON.stringify({ client_secret: "shh", link: "https://paypal.me/local" }),
			stripe: JSON.stringify({ secret_key: "sk_live_x" }),
			zelle: { email: "z@x.com", token: "no" },
		};
		expect(sanitizeBranchPaymentConfig(branch)).toEqual({
			id: "b1",
			payment_methods: ["efectivo", "paypal"],
			paypal: JSON.stringify({ link: "https://paypal.me/local" }),
			stripe: null,
			zelle: { email: "z@x.com" },
		});
	});

	it("no añade columnas que la fila no trae", () => {
		expect(sanitizeBranchPaymentConfig({ id: "b2", name: "Centro" })).toEqual({ id: "b2", name: "Centro" });
	});
});

describe("sanitizeBranchPaymentMethods", () => {
	it("devuelve null si no hay lista", () => {
		expect(sanitizeBranchPaymentMethods(null)).toBeNull();
		expect(sanitizeBranchPaymentMethods(["stripe", " zelle "])).toEqual(["zelle"]);
	});
});
