import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderEmail, sanitizeSubject } from "@/lib/email/render";
import { buildEmailContent, EMAIL_CATALOG, findCatalogEntry, type EmailKind, type EmailTemplates } from "@/lib/email/templates";
import { LEGAL_UPDATED_AT_LABEL } from "@/lib/legal/legal-documents";

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

	it("el enlace de una nota tampoco abre la puerta a HTML ni a otros esquemas", () => {
		const out = renderEmail({
			audience: "customer",
			tone: "brand",
			subject: "Prueba de nota",
			preheader: "Nota con enlace",
			title: "Prueba",
			blocks: [{ type: "note", text: "Lee **los** {link} antes.", link: { label: "<b>Términos</b>", url: "javascript:alert(1)" } }],
		});
		expect(out.html).toContain('href="#"');
		expect(out.html).toContain("&lt;b&gt;Términos&lt;/b&gt;");
		expect(out.text).toContain("Lee los <b>Términos</b> (#) antes.");
	});
});

describe("correos del alta", () => {
	const APP = "https://www.example.com";
	// La fecha sale de la versión vigente: subirla no rompe la prueba, pero el texto sí debe decirla.
	const TERMS = `Términos de servicio, versión del ${LEGAL_UPDATED_AT_LABEL}`;
	const PROMO = "2 meses al precio de 1 en tu primer pago";

	beforeEach(() => {
		vi.stubEnv("NEXT_PUBLIC_APP_URL", APP);
	});
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	function sample<K extends EmailKind>(kind: K): EmailTemplates[K] {
		const entry = findCatalogEntry(kind);
		if (!entry) throw new Error(`falta ${kind} en el catálogo`);
		return entry.sample as EmailTemplates[K];
	}

	const altaEmails = (): Array<[string, ReturnType<typeof render>]> => [
		["verify_email", render("verify_email", sample("verify_email"))],
		["verify_email solo panel", render("verify_email", { ...sample("verify_email"), panelOnly: true })],
		...(["store", "plan", "payment", "review"] as const).map(
			(step) => [`onboarding_continue ${step}`, render("onboarding_continue", { ...sample("onboarding_continue"), step })] as [string, ReturnType<typeof render>],
		),
		["welcome", render("welcome", sample("welcome"))],
		["welcome tienda abierta", render("welcome", { ...sample("welcome"), setPasswordUrl: undefined, storeOpened: true })],
		["store_draft_reminder", render("store_draft_reminder", sample("store_draft_reminder"))],
		["store_draft_expiring", render("store_draft_expiring", sample("store_draft_expiring"))],
		["payment_received", render("payment_received", sample("payment_received"))],
		["onboarding_existing_account", render("onboarding_existing_account", sample("onboarding_existing_account"))],
	];

	it("dicen lo mismo que el landing: sin exclamaciones, rayas, «en minutos» ni «hoy mismo», y con la marca", () => {
		for (const [name, out] of altaEmails()) {
			for (const text of [out.subject, out.text]) {
				expect(text, name).not.toMatch(/¡|—|–|en minutos|hoy mismo/i);
			}
			expect(out.html, name).toContain("Gcode POS");
		}
	});

	it("los que llevan a publicar o pagar traen la promo del primer pago con las palabras del landing", () => {
		const withPromo: Array<[string, ReturnType<typeof render>]> = [
			["verify_email", render("verify_email", sample("verify_email"))],
			["verify_email solo panel", render("verify_email", { ...sample("verify_email"), panelOnly: true })],
			["onboarding_continue store", render("onboarding_continue", { ...sample("onboarding_continue"), step: "store" })],
			["onboarding_continue plan", render("onboarding_continue", { ...sample("onboarding_continue"), step: "plan" })],
			["onboarding_continue payment", render("onboarding_continue", { ...sample("onboarding_continue"), step: "payment" })],
			["store_draft_reminder", render("store_draft_reminder", sample("store_draft_reminder"))],
			["store_draft_expiring", render("store_draft_expiring", sample("store_draft_expiring"))],
		];
		for (const [name, out] of withPromo) expect(out.text, name).toContain(PROMO);
	});

	it("con «solo panel CEO» la confirmación del correo no promete armar una tienda", () => {
		const content = buildEmailContent("verify_email", { ...sample("verify_email"), panelOnly: true });
		expect(content.preheader).toBe("Confirma tu correo para elegir tu plan y empezar a usar el panel CEO.");
		for (const text of [content.preheader, content.intro ?? ""]) expect(text).not.toMatch(/arm[ae]|gratis|tienda/i);
		expect(buildEmailContent("verify_email", sample("verify_email")).intro).toContain("la armas gratis");
	});

	it("«ya tienes una cuenta» es un aviso neutro: solo el login y crear una contraseña nueva", () => {
		const data = { loginUrl: `${APP}/login`, recoverUrl: `${APP}/login/recuperar` };
		const content = buildEmailContent("onboarding_existing_account", data);
		const out = renderEmail(content);
		expect(out.subject).toBe("Ya tienes una cuenta en Gcode POS");
		expect(content.cta).toEqual({ label: "Entrar", url: data.loginUrl });
		expect(content.secondary).toEqual({ label: "Crear una contraseña nueva", url: data.recoverUrl });
		expect(content.intro).toContain("Alguien (seguramente tú) intentó registrarse con este correo.");
		expect(out.text).not.toMatch(/token|code=/i);
		expect(content.greeting).toBe("Hola:");
	});

	it("la confirmación del pago enlaza a los Términos vigentes con su versión, con URL absoluta", () => {
		for (const out of [
			render("welcome", sample("welcome")),
			render("welcome", { ...sample("welcome"), setPasswordUrl: undefined, storeOpened: true }),
			render("payment_received", sample("payment_received")),
		]) {
			expect(out.html).toContain(`href="${APP}/onboarding/terminos"`);
			expect(out.html).toContain(TERMS);
			expect(out.text).toContain(`${TERMS} (${APP}/onboarding/terminos)`);
		}
	});

	it("la bienvenida trae lo contratado y nombra el panel CEO en vez de «la caja»", () => {
		const opened = render("welcome", { ...sample("welcome"), setPasswordUrl: undefined, storeOpened: true });
		expect(opened.text).toContain("Entra al panel CEO para recibir pedidos");
		expect(opened.text).not.toMatch(/Abre la caja|panel de tu local/);
		const classic = render("welcome", sample("welcome"));
		expect(classic.text).toContain("Próxima renovación: 23 de noviembre de 2026");
		expect(classic.text).not.toContain("Tu panel:");
	});

	it("con «solo panel CEO» la bienvenida no habla del menú", () => {
		const out = render("welcome", { ...sample("welcome"), panelOnly: true });
		expect(out.text).not.toMatch(/Carga tu menú|Cargar tu menú|Tu menú público/);
		expect(out.text).toContain("Entra al panel CEO");
	});
});
