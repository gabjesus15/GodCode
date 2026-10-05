import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { escapeTelegramHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/infra/telegram";

function fakeFetch(status = 200, body = '{"ok":true}') {
	const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
	const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> });
		return new Response(body, { status });
	});
	return { impl: impl as unknown as typeof fetch, calls };
}

beforeEach(() => {
	vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
	vi.stubEnv("TELEGRAM_CHAT_ID", "-100777");
});
afterEach(() => vi.unstubAllEnvs());

describe("sendTelegramMessage", () => {
	it("sin token o chat no llama a Telegram y lo dice", async () => {
		vi.stubEnv("TELEGRAM_CHAT_ID", "");
		const { impl } = fakeFetch();
		expect(isTelegramConfigured()).toBe(false);
		expect(await sendTelegramMessage("<b>hola</b>", { fetchImpl: impl })).toBe("skipped");
		expect(impl).not.toHaveBeenCalled();
	});

	it("manda el HTML al chat configurado sin vista previa de enlaces", async () => {
		const { impl, calls } = fakeFetch();
		expect(await sendTelegramMessage("<b>Nueva solicitud</b>", { fetchImpl: impl })).toBe("sent");
		expect(calls[0].url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
		expect(calls[0].body).toMatchObject({
			chat_id: "-100777",
			text: "<b>Nueva solicitud</b>",
			parse_mode: "HTML",
			disable_web_page_preview: true,
		});
	});

	it("un error de Telegram o de red devuelve failed, nunca lanza", async () => {
		const bad = fakeFetch(400, '{"ok":false,"description":"chat not found"}');
		expect(await sendTelegramMessage("x", { fetchImpl: bad.impl })).toBe("failed");
		const boom = vi.fn(async () => {
			throw new Error("ECONNRESET");
		}) as unknown as typeof fetch;
		expect(await sendTelegramMessage("x", { fetchImpl: boom })).toBe("failed");
	});

	it("escapa lo que escribe la persona", () => {
		expect(escapeTelegramHtml('<script>alert("x") & y</script>')).toBe('&lt;script&gt;alert("x") &amp; y&lt;/script&gt;');
	});
});
