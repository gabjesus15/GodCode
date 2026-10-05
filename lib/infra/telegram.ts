import { logger } from "@/lib/infra/logger";

/**
 * Avisos al equipo por Telegram (Bot API `sendMessage`).
 *
 * Variables: `TELEGRAM_BOT_TOKEN` (del bot creado con @BotFather) y `TELEGRAM_CHAT_ID`
 * (el chat o grupo donde el bot escribe). Sin alguna de las dos no se manda nada y
 * se devuelve "skipped": el aviso es un extra y nunca puede romper el flujo que lo
 * dispara. Un fallo del proveedor se loguea y se devuelve "failed", sin lanzar.
 */

const TELEGRAM_API = "https://api.telegram.org";
/** Telegram responde en milisegundos; si tarda más, el flujo no espera. */
const TIMEOUT_MS = 6_000;
/** Límite de Telegram por mensaje. */
const MAX_LENGTH = 4096;

export type TelegramSendResult = "sent" | "skipped" | "failed";

function readEnv(name: string): string {
	return (process.env[name] ?? "").trim();
}

export function isTelegramConfigured(): boolean {
	return Boolean(readEnv("TELEGRAM_BOT_TOKEN") && readEnv("TELEGRAM_CHAT_ID"));
}

/** Texto libre dentro de un mensaje con `parse_mode: HTML`. */
export function escapeTelegramHtml(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/**
 * Manda `html` al chat configurado. Devuelve el resultado en vez de lanzar: quien
 * llama decide si le importa (casi nunca).
 */
export async function sendTelegramMessage(
	html: string,
	options: { fetchImpl?: typeof fetch; silent?: boolean } = {},
): Promise<TelegramSendResult> {
	const token = readEnv("TELEGRAM_BOT_TOKEN");
	const chatId = readEnv("TELEGRAM_CHAT_ID");
	if (!token || !chatId) return "skipped";
	const text = String(html ?? "").trim();
	if (!text) return "skipped";

	const fetchImpl = options.fetchImpl ?? fetch;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetchImpl(`${TELEGRAM_API}/bot${token}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text: text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text,
				parse_mode: "HTML",
				disable_web_page_preview: true,
				disable_notification: Boolean(options.silent),
			}),
			signal: controller.signal,
			cache: "no-store",
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			// El token nunca va al log: solo el estado y lo que dijo Telegram.
			logger.warn("telegram_send_failed", { status: res.status, detail: detail.slice(0, 200) });
			return "failed";
		}
		return "sent";
	} catch (error) {
		logger.warn("telegram_send_failed", { message: error instanceof Error ? error.message : String(error) });
		return "failed";
	} finally {
		clearTimeout(timer);
	}
}
