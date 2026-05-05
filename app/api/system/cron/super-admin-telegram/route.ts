import { NextRequest, NextResponse } from "next/server";

import {
	computeInitialOnboardingWatermark,
	fetchOnboardingApplicationsCreatedAfter,
	formatOnboardingApplicationsTelegramHtml,
	getOnboardingTelegramWatermarkDb,
	maxCreatedAt,
	parseTelegramChatIds,
	sendTelegramHtmlMessage,
	setOnboardingTelegramWatermarkDb,
} from "@/lib/super-admin/telegram-alerts";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function GET(req: NextRequest) {
	const isDev = process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV;
	const expectedSecret = process.env.CRON_SECRET?.trim();

	if (!isDev && !expectedSecret) {
		return NextResponse.json(
			{ error: "CRON_SECRET es obligatorio en entornos desplegados" },
			{ status: 503 },
		);
	}

	const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
	if (expectedSecret && secret !== expectedSecret) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
	const chatIds = parseTelegramChatIds(process.env.TELEGRAM_CHAT_ID);

	if (!botToken || chatIds.length === 0) {
		return NextResponse.json(
			{
				error:
					"TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID son obligatorios para este cron (sin archivo local en Vercel)",
			},
			{ status: 503 },
		);
	}

	try {
		let watermark = await getOnboardingTelegramWatermarkDb(supabaseAdmin);

		if (!watermark) {
			watermark = await computeInitialOnboardingWatermark(supabaseAdmin);
			await setOnboardingTelegramWatermarkDb(supabaseAdmin, watermark);
			return NextResponse.json({
				ok: true,
				message:
					"Marca de agua inicializada en BD (último onboarding o ahora); sin notificaciones en esta ejecución",
				watermark,
			});
		}

		const rows = await fetchOnboardingApplicationsCreatedAfter(supabaseAdmin, watermark);

		if (rows.length === 0) {
			return NextResponse.json({ ok: true, notified: 0, message: "Nada nuevo" });
		}

		const panelBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
		const text = formatOnboardingApplicationsTelegramHtml(rows, panelBase);

		await sendTelegramHtmlMessage({ botToken, chatIds, text });

		const nextWm = maxCreatedAt(rows);
		await setOnboardingTelegramWatermarkDb(supabaseAdmin, nextWm);

		return NextResponse.json({ ok: true, notified: rows.length, watermark: nextWm });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error("[cron/super-admin-telegram]", msg);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	return GET(req);
}
