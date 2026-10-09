import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { sendEmail, teamInbox } from "@/lib/email/send";
import { enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { logger } from "@/lib/infra/logger";
import { assertJsonRateLimit } from "@/lib/infra/public-rate-limit";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/infra/telegram";
import { labelForBudget, labelForProjectType, parseQuoteRequest } from "@/lib/labs/quote-request";
import { verifyRecaptcha } from "@/lib/onboarding/recaptcha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * reCAPTCHA se exige solo si el sitio tiene las dos claves: sin la pública el formulario
 * no puede pedir token, y exigirlo dejaría la cotización rota. Es la misma verificación
 * del alta (`lib/onboarding/recaptcha`); sin clave secreta, `verifyRecaptcha` acepta.
 */
function recaptchaSecret(): string | undefined {
	if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()) return undefined;
	return process.env.RECAPTCHA_SECRET_KEY;
}

/**
 * Solicitud de cotización desde la home de Gcode Labs.
 *
 * En orden: límite por IP, validación, reCAPTCHA (cuando hay claves) y límite por
 * correo. La verificación va antes del límite por correo para que un bot no pueda
 * agotar el cupo del correo de otra persona. Después avisa al equipo por los dos
 * canales que ya usa el alta: Telegram (inmediato) y correo a la bandeja del equipo.
 * No guarda nada en base de datos: la conversación sigue por correo o WhatsApp.
 */
export async function POST(req: NextRequest) {
	// El mensaje genérico del límite dice «un minuto»; la ventana aquí es de diez. Bajo cada
	// error general el formulario ofrece WhatsApp, así que el texto no lo repite.
	if (await assertJsonRateLimit(req, "labs-quote", 5, 10 * 60_000)) {
		return NextResponse.json(
			{ ok: false, error: "Recibimos varias solicitudes desde tu conexión. Espera unos minutos e inténtalo de nuevo." },
			{ status: 429 },
		);
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
	}

	const parsed = parseQuoteRequest(body);
	if (!parsed.ok) {
		return NextResponse.json({ ok: false, error: parsed.error, field: parsed.field }, { status: 400 });
	}
	const quote = parsed.value;

	const recaptcha = await verifyRecaptcha(readRecaptchaToken(body), recaptchaSecret());
	if (!recaptcha.ok) {
		logger.warn("labs_quote_recaptcha_failed", { reason: recaptcha.error });
		return NextResponse.json(
			{ ok: false, error: "No pudimos comprobar que eres una persona. Recarga la página e inténtalo de nuevo." },
			{ status: 400 },
		);
	}

	// Un mismo correo no manda más de tres solicitudes por hora, venga de la IP que venga. La clave
	// del límite lleva el correo como hash para no dejar direcciones en el almacén de límites.
	const emailKey = createHash("sha256").update(quote.email).digest("hex").slice(0, 32);
	if (await enforceScopedRateLimit(`labs-quote:email:${emailKey}`, 3, 60 * 60_000)) {
		return NextResponse.json(
			{ ok: false, error: "Este correo ya envió varias solicitudes en la última hora. Te respondemos ahí." },
			{ status: 429 },
		);
	}

	const projectType = labelForProjectType(quote.projectType);
	const budget = labelForBudget(quote.budget);

	const telegram = sendTelegramMessage(
		[
			"💼 <b>Nueva cotización (Gcode Labs)</b>",
			`<b>Empresa:</b> ${escapeTelegramHtml(quote.company)}`,
			`<b>Contacto:</b> ${escapeTelegramHtml(quote.name)} · ${escapeTelegramHtml(quote.email)}${quote.phone ? ` · ${escapeTelegramHtml(quote.phone)}` : ""}`,
			`<b>Proyecto:</b> ${escapeTelegramHtml(projectType)} · <b>Presupuesto:</b> ${escapeTelegramHtml(budget)}`,
			"",
			escapeTelegramHtml(quote.message),
		].join("\n"),
	).catch(() => "failed" as const);

	const email = sendEmail({
		kind: "team_labs_quote",
		to: teamInbox(),
		data: {
			name: quote.name,
			company: quote.company,
			email: quote.email,
			phone: quote.phone ?? undefined,
			projectType,
			budget,
			message: quote.message,
		},
		whenLedgerUnavailable: "send",
		dedupeKey: `labs-quote:${quote.email}:${Date.now().toString(36)}`,
	}).catch((error: unknown) => {
		logger.warn("labs_quote_email_failed", { message: error instanceof Error ? error.message : String(error) });
		return { status: "failed" as const };
	});

	const [telegramResult, emailResult] = await Promise.all([telegram, email]);
	const delivered = telegramResult === "sent" || emailResult.status === "sent";

	logger.info("labs_quote_received", {
		projectType: quote.projectType,
		budget: quote.budget,
		telegram: telegramResult,
		email: emailResult.status,
	});

	if (!delivered) {
		// Ningún canal configurado o ambos fallaron: no fingir que llegó.
		return NextResponse.json(
			{ ok: false, error: "No pudimos registrar la solicitud. Escríbenos por WhatsApp o correo mientras lo arreglamos." },
			{ status: 503 },
		);
	}

	return NextResponse.json({ ok: true });
}

/** El token de reCAPTCHA viaja junto a los campos del formulario; `parseQuoteRequest` lo ignora. */
function readRecaptchaToken(body: unknown): string | null {
	if (!body || typeof body !== "object") return null;
	const token = (body as { recaptchaToken?: unknown }).recaptchaToken;
	return typeof token === "string" ? token : null;
}
