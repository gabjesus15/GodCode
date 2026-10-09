import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createFakeSupabase } from "../../stubs/fake-supabase";

vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));

import { getCompanySender, saveCompanySender } from "@/lib/email/company-sender";
import { SECRET_BOX_TEST_KEY } from "@/lib/email/email-contract-cases";
import { createSecretBox } from "@/lib/email/secret-box";

const COMPANY = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function resend(status = 200, body: Record<string, unknown> = { id: "msg_1" }) {
	const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function db(rows: Array<Record<string, unknown>> = []) {
	const fake = createFakeSupabase({ company_email_senders: rows });
	return { client: fake.client as unknown as SupabaseClient, rows: () => fake.db.company_email_senders };
}

const input = {
	companyId: COMPANY,
	apiKey: "re_123456789_abcd",
	fromEmail: "Cupones@OishiSushi.shop",
	fromName: 'Oishi "Sushi"',
	replyTo: "",
	testTo: "admin@godcode.me",
	actorEmail: "admin@godcode.me",
};

beforeEach(() => {
	vi.stubEnv("EMAIL_SENDER_SECRET_KEY", SECRET_BOX_TEST_KEY);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("saveCompanySender", () => {
	it("manda la prueba con la key del negocio y guarda la key sellada", async () => {
		const fetchMock = resend();
		const { client, rows } = db();

		await expect(saveCompanySender(input, client)).resolves.toEqual({ ok: true });

		const [, init] = fetchMock.mock.calls[0];
		expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer re_123456789_abcd");
		const sent = JSON.parse(String(init?.body));
		expect(sent.from).toBe('"Oishi Sushi" <cupones@oishisushi.shop>');
		expect(sent.to).toBe("admin@godcode.me");

		const [row] = rows();
		expect(row.api_key_sealed).toMatch(/^sk:v1:/);
		expect(row.api_key_sealed).not.toContain("re_123456789");
		expect(row.api_key_last4).toBe("abcd");
		expect(row.from_email).toBe("cupones@oishisushi.shop");
		expect(row.verified_at).toBeTruthy();
		const box = await createSecretBox(SECRET_BOX_TEST_KEY);
		await expect(box.open(String(row.api_key_sealed))).resolves.toBe("re_123456789_abcd");
	});

	it("si Resend rechaza la prueba no guarda nada y dice por qué", async () => {
		resend(403, { message: "The oishisushi.shop domain is not verified" });
		const { client, rows } = db();

		const result = await saveCompanySender(input, client);

		expect(result).toEqual({
			ok: false,
			status: 400,
			error: "Resend no envió la prueba: The oishisushi.shop domain is not verified",
		});
		expect(rows()).toHaveLength(0);
	});

	it("sin key nueva reusa la guardada (cambiar solo el remitente)", async () => {
		const box = await createSecretBox(SECRET_BOX_TEST_KEY);
		const fetchMock = resend();
		const { client, rows } = db([
			{ company_id: COMPANY, api_key_sealed: await box.seal("re_guardada_9999"), api_key_last4: "9999", from_email: "viejo@oishisushi.shop" },
		]);

		await expect(saveCompanySender({ ...input, apiKey: "", fromEmail: "hola@oishisushi.shop" }, client)).resolves.toEqual({
			ok: true,
		});

		expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe("Bearer re_guardada_9999");
		expect(rows()[0].from_email).toBe("hola@oishisushi.shop");
		expect(rows()[0].api_key_last4).toBe("9999");
	});

	it("valida antes de llamar a Resend", async () => {
		const fetchMock = resend();
		const { client } = db();

		expect(await saveCompanySender({ ...input, fromEmail: "no-es-correo" }, client)).toMatchObject({ ok: false, status: 400 });
		expect(await saveCompanySender({ ...input, apiKey: "sk_live_x" }, client)).toMatchObject({ ok: false, status: 400 });
		expect(await saveCompanySender({ ...input, apiKey: "" }, client)).toMatchObject({ ok: false, error: "Falta la API key de Resend" });
		vi.stubEnv("EMAIL_SENDER_SECRET_KEY", "");
		expect(await saveCompanySender(input, client)).toMatchObject({ ok: false, status: 503 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("un correo armado para trabar la validación se rechaza al instante", async () => {
		const fetchMock = resend();
		const { client } = db();
		// Con la expresión anterior, «a@» y muchos puntos tardaban un tiempo cuadrático en fallar.
		const attacks = ["a@" + ".".repeat(50_000) + "@", "a@" + "x.".repeat(25_000) + " ", "a@b." + "c".repeat(50_000) + " "];

		for (const fromEmail of attacks) {
			const started = performance.now();
			expect(await saveCompanySender({ ...input, fromEmail }, client)).toEqual({
				ok: false,
				status: 400,
				error: "El correo remitente no es válido",
			});
			expect(performance.now() - started).toBeLessThan(200);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("acepta subdominios y rechaza un dominio que termina en punto", async () => {
		resend();
		const { client } = db();

		await expect(saveCompanySender({ ...input, fromEmail: "cupones@mail.oishi.co.uk" }, client)).resolves.toEqual({ ok: true });
		expect(await saveCompanySender({ ...input, fromEmail: "cupones@oishisushi.shop." }, client)).toMatchObject({ ok: false, status: 400 });
	});
});

describe("getCompanySender", () => {
	it("nunca devuelve la key, solo sus últimos 4", async () => {
		const { client } = db([
			{ company_id: COMPANY, api_key_sealed: "sk:v1:xxx", api_key_last4: "abcd", from_email: "cupones@oishisushi.shop", from_name: "Oishi", verified_at: "2026-10-04T00:00:00Z" },
		]);

		const sender = await getCompanySender(COMPANY, client);

		expect(sender).toMatchObject({ fromEmail: "cupones@oishisushi.shop", apiKeyLast4: "abcd", verifiedAt: "2026-10-04T00:00:00Z" });
		expect(JSON.stringify(sender)).not.toContain("sk:v1");
	});
});
