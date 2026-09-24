import { describe, expect, it } from "vitest";

import { renderEmail, sanitizeSubject } from "@/lib/email/render";
import { buildEmailContent, EMAIL_CATALOG, type EmailKind, type EmailTemplates } from "@/lib/email/templates";

function render<K extends EmailKind>(kind: K, data: EmailTemplates[K]) {
	return renderEmail(buildEmailContent(kind, data));
}

describe("catálogo de correos", () => {
	it.each(EMAIL_CATALOG.map((entry) => [entry.kind, entry] as const))("%s se arma completo con los datos de ejemplo", (_kind, entry) => {
		const content = buildEmailContent(entry.kind, entry.sample as never);
		const out = renderEmail(content);

		expect(out.subject.length).toBeGreaterThan(8);
		expect(content.preheader.length).toBeGreaterThan(8);
		for (const text of [out.subject, out.html, out.text]) {
			expect(text).not.toMatch(/undefined|NaN|\$\{|\[object Object\]/);
			// La marca es Gcode; el nombre anterior solo vive en los datos para buscadores.
			expect(text).not.toContain("GodCode");
		}
		expect(out.text).toContain(content.title);
		if (content.cta) expect(out.text).toContain(content.cta.url);
	});

	it("no repite tipos y cada uno dice cuándo sale", () => {
		const kinds = EMAIL_CATALOG.map((entry) => entry.kind);
		expect(new Set(kinds).size).toBe(kinds.length);
		for (const entry of EMAIL_CATALOG) expect(entry.trigger.length).toBeGreaterThan(10);
	});
});

describe("recordatorio de vencimiento", () => {
	const base = { businessName: "Rica Pizza", planName: "Pro", endsAt: "30 de septiembre de 2026", trial: false, amount: "US$ 29,00" };

	it("cambia el asunto y el tono según los días que faltan", () => {
		const week = buildEmailContent("renewal_reminder", { ...base, daysLeft: 7 });
		const tomorrow = buildEmailContent("renewal_reminder", { ...base, daysLeft: 1 });
		const today = buildEmailContent("renewal_reminder", { ...base, daysLeft: 0 });

		expect(week.subject).toBe("Tu plan Pro vence el 30 de septiembre de 2026");
		expect(week.tone).toBe("brand");
		expect(tomorrow.subject).toBe("Tu plan Pro vence mañana");
		expect(tomorrow.tone).toBe("warning");
		expect(today.subject).toBe("Tu plan Pro vence hoy");
	});

	it("en prueba gratis habla de la prueba y, con un pago iniciado, lleva a completarlo", () => {
		const trial = buildEmailContent("renewal_reminder", { ...base, daysLeft: 3, trial: true });
		const withOrder = buildEmailContent("renewal_reminder", { ...base, daysLeft: 3, hasOpenOrder: true });

		expect(trial.subject).toContain("Tu prueba de");
		expect(withOrder.cta?.label).toBe("Completar el pago");
		expect(withOrder.cta?.url).toContain("tab=facturacion");
	});
});

describe("seguridad del HTML", () => {
	it("escapa en el HTML lo que escribe el usuario, pero no en el asunto", () => {
		const out = render("verify_email", {
			name: "Ana",
			businessName: 'Pizza & Co <a href="https://evil.test">x</a>',
			verifyUrl: "https://example.com/onboarding/verify?a=1&b=2",
		});

		expect(out.html).not.toContain('<a href="https://evil.test">');
		expect(out.html).toContain("Pizza &amp; Co &lt;a href=&quot;https://evil.test&quot;&gt;x&lt;/a&gt;");
		expect(out.subject).toContain('Pizza & Co <a href="https://evil.test">x</a>');
		expect(out.html).toContain("a=1&amp;b=2");
	});

	it("no deja pasar enlaces que no sean http(s) o mailto", () => {
		const out = render("password_reset", { resetUrl: "javascript:alert(1)" });

		expect(out.html).not.toContain("javascript:");
		expect(out.html).toContain('href="#"');
	});

	it("la negrita y los saltos de línea no abren la puerta a HTML", () => {
		const out = render("payment_received", {
			businessName: "**<b>Hola</b>**",
			concept: "Renovación",
			amount: "US$ 10,00",
			paidAt: "hoy",
			detail: "Línea 1\nLínea 2",
		});

		expect(out.html).toContain("&lt;b&gt;Hola&lt;/b&gt;</strong>");
		expect(out.html).toContain("Línea 1<br>Línea 2");
	});

	it("el asunto queda en una sola línea", () => {
		expect(sanitizeSubject("Hola\nmundo\t!  ")).toBe("Hola mundo !");
	});
});
