import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { extractMenuDraft, isMenuImportEnabled } from "@/lib/menu/ai-menu-import";

function fakeClient(response: unknown) {
	const parse = vi.fn(async (_params: Record<string, unknown>) => response);
	return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("extractMenuDraft", () => {
	it("se apaga sin clave de API", async () => {
		vi.stubEnv("ANTHROPIC_API_KEY", "");
		expect(isMenuImportEnabled()).toBe(false);
		expect(await extractMenuDraft({ kind: "text", text: "Pizza 8.990" })).toMatchObject({ ok: false, code: "disabled" });
	});

	it("manda la foto con salida estructurada y fallback, y devuelve el borrador limpio", async () => {
		const { client, parse } = fakeClient({
			stop_reason: "end_turn",
			parsed_output: {
				categories: [
					{
						name: "Pizzas",
						products: [
							{ name: "Margarita", description: "Tomate y queso", price: "8.990" },
							{ name: "Sin precio", description: "", price: "" },
						],
					},
				],
				notes: " La última línea estaba borrosa. ",
			},
		});
		const result = await extractMenuDraft({ kind: "image", mediaType: "image/jpeg", base64: "AAAA" }, client);
		expect(result).toEqual({
			ok: true,
			notes: "La última línea estaba borrosa.",
			draft: { categories: [{ name: "Pizzas", products: [{ name: "Margarita", description: "Tomate y queso", price: 8990 }] }] },
			dropped: 1,
			truncated: 0,
		});
		const params = parse.mock.calls[0][0] as Record<string, unknown> & {
			messages: Array<{ content: Array<{ type: string }> }>;
			output_config: { effort: string; format: unknown };
		};
		expect(params).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
		expect(params.output_config.effort).toBe("low");
		expect(params.output_config.format).toBeTruthy();
		expect(params.messages[0].content.map((b) => b.type)).toEqual(["image", "text"]);
	});

	it("manda el PDF como documento y el Excel como texto", async () => {
		const pdf = fakeClient({ stop_reason: "end_turn", parsed_output: { categories: [{ name: "A", products: [{ name: "B", description: "", price: "1" }] }], notes: "" } });
		await extractMenuDraft({ kind: "pdf", base64: "JVBERi0=" }, pdf.client);
		const pdfContent = (pdf.parse.mock.calls[0][0] as { messages: Array<{ content: Array<{ type: string }> }> }).messages[0].content;
		expect(pdfContent[0].type).toBe("document");

		const text = fakeClient({ stop_reason: "end_turn", parsed_output: { categories: [{ name: "A", products: [{ name: "B", description: "", price: "1" }] }], notes: "" } });
		await extractMenuDraft({ kind: "text", text: "Pizza\t8990" }, text.client);
		const textContent = (text.parse.mock.calls[0][0] as { messages: Array<{ content: Array<{ type: string; text?: string }> }> }).messages[0].content;
		expect(textContent[0]).toMatchObject({ type: "text" });
		expect(textContent[0].text).toContain("Pizza\t8990");
	});

	it("explica cuando no encuentra productos, cuando se rechaza o cuando la carta es muy larga", async () => {
		const empty = fakeClient({ stop_reason: "end_turn", parsed_output: { categories: [], notes: "" } });
		expect(await extractMenuDraft({ kind: "text", text: "x" }, empty.client)).toMatchObject({ ok: false, code: "unreadable" });

		const refused = fakeClient({ stop_reason: "refusal", parsed_output: null });
		expect(await extractMenuDraft({ kind: "text", text: "x" }, refused.client)).toMatchObject({ ok: false, code: "refused" });

		const long = fakeClient({ stop_reason: "max_tokens", parsed_output: null });
		const result = await extractMenuDraft({ kind: "text", text: "x" }, long.client);
		expect(result).toMatchObject({ ok: false, code: "unreadable" });
		expect(!result.ok && result.error).toContain("por partes");
	});

	it("traduce los errores de la API a mensajes para el dueño", async () => {
		const parse = vi.fn(async () => {
			throw new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", new Headers());
		});
		const client = { beta: { messages: { parse } } } as unknown as Anthropic;
		expect(await extractMenuDraft({ kind: "text", text: "x" }, client)).toMatchObject({ ok: false, code: "rate_limited" });
	});
});
