import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createFakeSupabase, type FakeOptions } from "../../stubs/fake-supabase";

// El registro recibe el cliente por parámetro; el global no se usa en estos tests.
vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));

import { resolveFromAddress, sendEmail } from "@/lib/email/send";

function resend(responses: Array<{ status: number; body: Record<string, unknown> }>) {
	const queue = [...responses];
	const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => {
		const next = queue.shift() ?? { status: 200, body: { id: "re_default" } };
		return new Response(JSON.stringify(next.body), { status: next.status });
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function ledger(options: FakeOptions = { unique: { email_deliveries: ["dedupe_key"] } }) {
	const fake = createFakeSupabase({ email_deliveries: [] }, options);
	return { client: fake.client as unknown as SupabaseClient, rows: () => fake.db.email_deliveries };
}

function body(fetchMock: ReturnType<typeof resend>, call = 0) {
	const init = fetchMock.mock.calls[call]?.[1] as RequestInit;
	return { json: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> };
}

const reset = { kind: "password_reset" as const, to: "dueno@example.com", data: { resetUrl: "https://example.com/r" } };

beforeEach(() => {
	vi.stubEnv("RESEND_API_KEY", "re_test");
	vi.stubEnv("RESEND_FROM", "hola@gcode.test");
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("sendEmail", () => {
	it("manda HTML y texto, con remitente con nombre, respuesta al soporte y etiqueta del tipo", async () => {
		const fetchMock = resend([{ status: 200, body: { id: "re_1" } }]);
		const { client, rows } = ledger();

		const result = await sendEmail({ ...reset, client });

		expect(result).toEqual({ status: "sent", id: "re_1" });
		const { json } = body(fetchMock);
		expect(json.from).toBe("Gcode POS <hola@gcode.test>");
		expect(json.text).toContain("https://example.com/r");
		expect(json.html).toContain("<!DOCTYPE html>");
		expect(json.reply_to).toMatch(/@/);
		expect(json.tags).toEqual([{ name: "kind", value: "password_reset" }]);
		expect(rows()[0]).toMatchObject({ kind: "password_reset", status: "sent", provider_message_id: "re_1", recipient: "dueno@example.com" });
	});

	it("no repite un correo con la misma clave y se la pasa a Resend como idempotencia", async () => {
		const fetchMock = resend([{ status: 200, body: { id: "re_1" } }]);
		const { client } = ledger();

		const first = await sendEmail({ ...reset, dedupeKey: "renewal:co-1:2026-09-30:7", client });
		const second = await sendEmail({ ...reset, dedupeKey: "renewal:co-1:2026-09-30:7", client });

		expect(first.status).toBe("sent");
		expect(second).toEqual({ status: "duplicate" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(body(fetchMock).headers["Idempotency-Key"]).toBe("renewal:co-1:2026-09-30:7");
	});

	it("si Resend falla, libera la clave para que el próximo cron lo reintente", async () => {
		resend([
			{ status: 500, body: { message: "caído" } },
			{ status: 200, body: { id: "re_2" } },
		]);
		const { client, rows } = ledger();

		const failed = await sendEmail({ ...reset, dedupeKey: "order:pay-1:1", client });
		expect(failed).toEqual({ status: "failed", error: "caído" });
		expect(rows()[0]).toMatchObject({ status: "failed", dedupe_key: null });

		const retried = await sendEmail({ ...reset, dedupeKey: "order:pay-1:1", client });
		expect(retried.status).toBe("sent");
	});

	it("sin la tabla de registro: los recordatorios no salen y los avisos sí", async () => {
		const fetchMock = resend([{ status: 200, body: { id: "re_3" } }]);
		const { client } = ledger({ missingTables: ["email_deliveries"] });

		const reminder = await sendEmail({ ...reset, dedupeKey: "renewal:x", whenLedgerUnavailable: "skip", client });
		expect(reminder.status).toBe("skipped");
		expect(fetchMock).not.toHaveBeenCalled();

		const notice = await sendEmail({ ...reset, client });
		expect(notice.status).toBe("sent");
	});

	it("no intenta enviar sin configuración ni a una dirección inválida", async () => {
		const fetchMock = resend([]);
		const { client } = ledger();

		expect((await sendEmail({ ...reset, to: "no-es-correo", client })).status).toBe("skipped");
		vi.stubEnv("RESEND_API_KEY", "");
		expect((await sendEmail({ ...reset, client })).status).toBe("skipped");
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("resolveFromAddress", () => {
	it("antepone el producto solo si el remitente no trae nombre", () => {
		expect(resolveFromAddress("hola@gcode.test", "Gcode POS")).toBe("Gcode POS <hola@gcode.test>");
		expect(resolveFromAddress("Equipo Gcode <hola@gcode.test>", "Gcode POS")).toBe("Equipo Gcode <hola@gcode.test>");
		expect(resolveFromAddress("", "Gcode POS")).toBe("");
	});
});
