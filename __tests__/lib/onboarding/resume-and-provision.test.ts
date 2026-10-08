import { describe, expect, it } from "vitest";

import { whatsappUrlFromPhone } from "@/lib/onboarding/checkout-service";
import { resolveResumeTarget } from "@/lib/onboarding/resume-application";

const base = { payment_status: null, payment_reference_url: null, company_id: null };

describe("resolveResumeTarget", () => {
	it("lleva a cada uno al paso donde quedó", () => {
		expect(resolveResumeTarget({ ...base, status: "pending_verification" }, "t")).toEqual({ kind: "verify" });
		expect(resolveResumeTarget({ ...base, status: "email_verified" }, "t")).toEqual({
			kind: "continue",
			step: "store",
			path: "/onboarding/tienda?token=t",
		});
		expect(resolveResumeTarget({ ...base, status: "payment_pending", payment_status: "pending" }, "t")).toEqual({
			kind: "continue",
			step: "payment",
			path: "/onboarding/pago?token=t",
		});
		expect(
			resolveResumeTarget({ ...base, status: "payment_pending", payment_status: "pending_validation", payment_reference_url: "https://x/r.png" }, "t"),
		).toMatchObject({ kind: "continue", step: "review" });
	});

	it("quien ya armó su tienda en vista previa entra a su cuenta", () => {
		expect(resolveResumeTarget({ ...base, status: "email_verified", company_id: "c1" }, "t")).toEqual({ kind: "login" });
		expect(resolveResumeTarget({ ...base, status: "form_completed", payment_status: "pending", company_id: "c1" }, "t")).toEqual({ kind: "login" });
		expect(
			resolveResumeTarget({ ...base, status: "payment_pending", payment_status: "pending_validation", payment_reference_url: "https://x/r.png", company_id: "c1" }, "t"),
		).toMatchObject({ kind: "continue", step: "review" });
	});

	it("quien ya pagó va a entrar a su cuenta", () => {
		expect(resolveResumeTarget({ ...base, status: "active", payment_status: "paid", company_id: "c1" }, "t")).toEqual({ kind: "login" });
		expect(resolveResumeTarget({ ...base, status: "payment_pending", payment_status: "paid", company_id: "c1" }, "t")).toEqual({ kind: "login" });
	});
});

describe("whatsappUrlFromPhone", () => {
	it("acepta el número con código de país", () => {
		expect(whatsappUrlFromPhone("+58 412-123.4567", "Venezuela")).toBe("https://wa.me/584121234567");
	});

	it("completa el código del país cuando es inequívoco", () => {
		expect(whatsappUrlFromPhone("0412 1234567", "Venezuela")).toBe("https://wa.me/584121234567");
		expect(whatsappUrlFromPhone("9 1234 5678", "Chile")).toBe("https://wa.me/56912345678");
	});

	it("vacío o demasiado corto no genera enlace", () => {
		expect(whatsappUrlFromPhone("", "Chile")).toBeNull();
		expect(whatsappUrlFromPhone("1234", "Chile")).toBeNull();
	});
});
