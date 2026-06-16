import type { SupabaseClient } from "@supabase/supabase-js";

/** Clave en `super_admin_notification_state` para el watermark de solicitudes (cron). */
export const TELEGRAM_ONBOARDING_WATERMARK_KEY = "telegram_onboarding_watermark";

export type OnboardingApplicationAlertRow = {
	id: string;
	business_name: string;
	email: string;
	status: string;
	created_at: string;
};

type NotificationPayload = {
	lastNotifiedCreatedAt?: string;
};

export function escapeTelegramHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function formatOnboardingApplicationsTelegramHtml(
	rows: OnboardingApplicationAlertRow[],
	panelBaseUrl: string | undefined,
): string {
	const base = (panelBaseUrl ?? "").replace(/\/$/, "");
	const solicitudesPath = "/onboarding/solicitudes";
	const header =
		rows.length === 1
			? "<b>Nueva solicitud de onboarding</b>"
			: `<b>${rows.length} nuevas solicitudes de onboarding</b>`;
	const blocks = rows.map((row, i) => {
		const name = escapeTelegramHtml(row.business_name ?? "");
		const email = escapeTelegramHtml(row.email ?? "");
		const status = escapeTelegramHtml(row.status ?? "");
		const idShort = escapeTelegramHtml(row.id.slice(0, 8));
		const link =
			base.length > 0
				? `${base}${solicitudesPath}`
				: solicitudesPath;
		const linkEsc = escapeTelegramHtml(link);
		return (
			`${i + 1}. <b>${name}</b>\n` +
			`   ${email}\n` +
			`   Estado: <code>${status}</code>\n` +
			`   id: <code>${idShort}…</code>\n` +
			`   <a href="${linkEsc}">Abrir panel</a>`
		);
	});
	return `${header}\n\n${blocks.join("\n\n")}`;
}

export async function sendTelegramHtmlMessage(opts: {
	botToken: string;
	chatIds: string[];
	text: string;
}): Promise<void> {
	const urlBase = `https://api.telegram.org/bot${opts.botToken.trim()}/sendMessage`;
	for (const rawId of opts.chatIds) {
		const chatId = rawId.trim();
		if (!chatId) continue;
		const res = await fetch(urlBase, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text: opts.text,
				parse_mode: "HTML",
				disable_web_page_preview: true,
			}),
		});
		const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
		if (!res.ok || body.ok === false) {
			throw new Error(body.description ?? `Telegram HTTP ${res.status}`);
		}
	}
}

export async function fetchOnboardingApplicationsCreatedAfter(
	supabase: SupabaseClient,
	sinceIsoExclusive: string,
): Promise<OnboardingApplicationAlertRow[]> {
	const { data, error } = await supabase
		.from("onboarding_applications")
		.select("id,business_name,email,status,created_at")
		.gt("created_at", sinceIsoExclusive)
		.order("created_at", { ascending: true })
		.limit(50);

	if (error) {
		throw new Error(error.message);
	}

	return (data ?? []) as OnboardingApplicationAlertRow[];
}

/** Primera ejecución del polling: alinear al último `created_at` para no perder filas recién insertadas antes del primer run (equivalente a --bootstrap). */
export async function computeInitialOnboardingWatermark(
	supabase: SupabaseClient,
): Promise<string> {
	const latest = await fetchLatestOnboardingApplicationCreatedAt(supabase);
	return latest ?? new Date().toISOString();
}

export async function fetchLatestOnboardingApplicationCreatedAt(
	supabase: SupabaseClient,
): Promise<string | null> {
	const { data, error } = await supabase
		.from("onboarding_applications")
		.select("created_at")
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	const row = data as { created_at?: string } | null;
	return row?.created_at ?? null;
}

export async function getOnboardingTelegramWatermarkDb(
	supabase: SupabaseClient,
): Promise<string | null> {
	const { data, error } = await supabase
		.from("super_admin_notification_state")
		.select("payload")
		.eq("key", TELEGRAM_ONBOARDING_WATERMARK_KEY)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	const payload = data?.payload as NotificationPayload | undefined;
	const iso = payload?.lastNotifiedCreatedAt;
	return typeof iso === "string" && iso.length > 0 ? iso : null;
}

export async function setOnboardingTelegramWatermarkDb(
	supabase: SupabaseClient,
	lastNotifiedCreatedAt: string,
): Promise<void> {
	const now = new Date().toISOString();
	const { error } = await supabase.from("super_admin_notification_state").upsert(
		{
			key: TELEGRAM_ONBOARDING_WATERMARK_KEY,
			payload: { lastNotifiedCreatedAt } satisfies NotificationPayload,
			updated_at: now,
		},
		{ onConflict: "key" },
	);

	if (error) {
		throw new Error(error.message);
	}
}

export function parseTelegramChatIds(envValue: string | undefined): string[] {
	if (!envValue?.trim()) return [];
	return envValue
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

export function maxCreatedAt(rows: OnboardingApplicationAlertRow[]): string {
	if (rows.length === 0) return new Date().toISOString();
	let max = rows[0]!.created_at;
	for (const r of rows) {
		if (r.created_at > max) max = r.created_at;
	}
	return max;
}
