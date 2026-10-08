import { NextRequest, NextResponse } from "next/server";

import { sendEmail, teamInbox } from "@/lib/email/send";
import { logger } from "@/lib/infra/logger";
import { assertJsonRateLimit } from "@/lib/infra/public-rate-limit";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/infra/telegram";
import { labelForBudget, labelForProjectType, parseQuoteRequest } from "@/lib/labs/quote-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Solicitud de cotización desde la home de Gcode Labs.
 *
 * Valida, limita por IP y avisa al equipo por los dos canales que ya usa el
 * alta: Telegram (inmediato) y correo a la bandeja del equipo. No guarda nada
 * en base de datos: la conversación sigue por correo o WhatsApp.
 */
export async function POST(req: NextRequest) {
	const limited = await assertJsonRateLimit(req, "labs-quote", 5, 10 * 60_000);
	if (limited) return limited;

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
