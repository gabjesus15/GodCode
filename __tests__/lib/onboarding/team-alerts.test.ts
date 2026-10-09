import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendTelegramMessage = vi.fn(async (_html: string) => "sent" as const);
vi.mock("@/lib/infra/telegram", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/infra/telegram")>();
	return { ...actual, sendTelegramMessage: (html: string) => sendTelegramMessage(html) };
});

import { alertOnboardingTeam, formatOnboardingAlert } from "@/lib/onboarding/team-alerts";

const APP = "https://www.godcode.me";

beforeEach(() => sendTelegramMessage.mockClear());
afterEach(() => vi.unstubAllEnvs());

describe("formatOnboardingAlert", () => {
	it("la nueva solicitud dice quién es, en qué paso va y enlaza al panel", () => {
		const text = formatOnboardingAlert(
			{ kind: "application_created", businessName: "Junistreetfood", responsibleName: "Nelli", email: "nelli@example.com", phone: "+58 412", sector: "Comida rápida" },
			APP,
		);
		expect(text).toContain("<b>Nueva solicitud de alta: Junistreetfood</b>");
		expect(text).toContain("Nelli · nelli@example.com");
		expect(text).toContain("Teléfono: +58 412");
		expect(text).toContain("Paso 1 de 4");
		expect(text).toContain(`<a href="${APP}/dashboard">Abrir el panel</a>`);
	});

	it("cada paso siguiente nombra lo que falta", () => {
		expect(formatOnboardingAlert({ kind: "email_verified", businessName: "Juni", email: "n@x.com" }, APP)).toContain("Paso 2 de 4");
		const plan = formatOnboardingAlert(
			{ kind: "plan_chosen", businessName: "Juni", email: "n@x.com", planName: "Básico", months: 3, amount: "$57.00", method: "Pago Móvil" },
			APP,
		);
		expect(plan).toContain("Plan Básico · 3 meses · $57.00 · Pago Móvil");
		expect(plan).toContain("Paso 3 de 4");
		const receipt = formatOnboardingAlert(
			{ kind: "receipt_uploaded", businessName: "Juni", amount: "$57.00", method: "Pago Móvil", reference: "manual-1" },
			APP,
		);
		expect(receipt).toContain("Paso 4 de 4");
		expect(receipt).toContain(`<a href="${APP}/dashboard/pagos">Validar el pago</a>`);
		const active = formatOnboardingAlert(
			{ kind: "activated", businessName: "Juni", via: "paypal", planName: "Básico", months: 1, menuUrl: `${APP}/juni/menu` },
			APP,
		);
		expect(active).toContain("Negocio activado: Juni</b> (pagó con PayPal)");
		expect(active).toContain(`<a href="${APP}/juni/menu">Ver su menú</a>`);
		expect(formatOnboardingAlert({ kind: "activated", businessName: "Juni", via: "mercadopago" }, APP)).toContain(
			"Negocio activado: Juni</b> (pagó con Mercado Pago)",
		);
	});

	it("todos los avisos llevan nombre, correo y teléfono para escribirle", () => {
		const contact = { responsibleName: "Nelli", email: "nelli@example.com", phone: "+58 412 555 0000" };
		const alerts = [
			{ kind: "email_verified", businessName: "Juni", ...contact },
			{ kind: "plan_chosen", businessName: "Juni", ...contact, planName: "Básico" },
			{ kind: "receipt_uploaded", businessName: "Juni", ...contact, amount: "$57.00" },
			{ kind: "activated", businessName: "Juni", ...contact, via: "manual" },
		] as const;
		for (const alert of alerts) {
			const text = formatOnboardingAlert(alert, APP);
			expect(text).toContain("Nelli · nelli@example.com");
			expect(text).toContain("Teléfono: +58 412 555 0000");
		}
		// Sin teléfono no queda una línea vacía.
		expect(formatOnboardingAlert({ kind: "email_verified", businessName: "Juni", email: "n@x.com" }, APP)).not.toContain("Teléfono");
	});

	it("escapa el HTML que viene del formulario", () => {
		const text = formatOnboardingAlert(
			{ kind: "application_created", businessName: "<b>Pizza</b> & Co", email: "a@b.com" },
			APP,
		);
		expect(text).toContain("&lt;b&gt;Pizza&lt;/b&gt; &amp; Co");
		expect(text).not.toContain("<b>Pizza</b>");
	});
});

describe("alertOnboardingTeam", () => {
	it("manda el mensaje formateado y nunca lanza", async () => {
		vi.stubEnv("NEXT_PUBLIC_APP_URL", APP);
		await alertOnboardingTeam({ kind: "email_verified", businessName: "Juni", email: "n@x.com" });
		expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
		expect(String(sendTelegramMessage.mock.calls[0][0])).toContain("Correo verificado: Juni");
		sendTelegramMessage.mockRejectedValueOnce(new Error("boom"));
		await expect(alertOnboardingTeam({ kind: "email_verified", businessName: "Juni", email: "n@x.com" })).resolves.toBeUndefined();
	});
});
