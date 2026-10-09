import { describe, expect, it } from "vitest";

import {
	BINANCE_PAY_ID_ERROR,
	isValidBinancePayId,
	pickPublicPaymentConfig,
	sanitizeBranchPaymentConfig,
	sanitizeBranchPaymentMethods,
	validatePublicPaymentConfig,
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

	it("Binance Pay guarda Pay ID, correo y nombre", () => {
		expect(
			pickPublicPaymentConfig("binance_pay", { pay_id: " 123456789 ", email: "b@x.com", name: "Local", api_key: "no" }),
		).toEqual({ pay_id: "123456789", email: "b@x.com", name: "Local" });
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

describe("validatePublicPaymentConfig", () => {
	it("acepta un Pay ID de Binance de 6 a 12 cifras, con espacios alrededor", () => {
		expect(isValidBinancePayId("123456")).toBe(true);
		expect(isValidBinancePayId(" 123456789012 ")).toBe(true);
		expect(validatePublicPaymentConfig("binance_pay", { pay_id: "123456789", email: "b@x.com" })).toBeNull();
		expect(validatePublicPaymentConfig("binance_pay", JSON.stringify({ pay_id: " 987654321 " }))).toBeNull();
	});

	it("rechaza letras, espacios internos y largos fuera de rango con error de campo", () => {
		for (const payId of ["12345", "1234567890123", "12 345 678", "pagos@x.com", "ABC123456"]) {
			expect(isValidBinancePayId(payId), payId).toBe(false);
			expect(validatePublicPaymentConfig("binance_pay", { pay_id: payId }), payId).toEqual({
				field: "binance_pay.pay_id",
				message: BINANCE_PAY_ID_ERROR,
			});
		}
	});

	it("un Pay ID vacío o ausente no es error: el método puede guardarse a medias", () => {
		expect(validatePublicPaymentConfig("binance_pay", { pay_id: "", email: "b@x.com" })).toBeNull();
		expect(validatePublicPaymentConfig("binance_pay", { email: "b@x.com" })).toBeNull();
		expect(validatePublicPaymentConfig("binance_pay", null)).toBeNull();
		expect(validatePublicPaymentConfig("binance_pay", "no es json")).toBeNull();
	});

	it("los demás métodos no tienen formato fijo que revisar", () => {
		expect(validatePublicPaymentConfig("zelle", { email: "lo que sea" })).toBeNull();
		expect(validatePublicPaymentConfig("pago_movil", { telefono: "abc" })).toBeNull();
	});
});
