import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeDb } from "../../stubs/fake-supabase";
import { UNSUBSCRIBE_CASES, UNSUBSCRIBE_TEST_SECRET } from "@/lib/email/email-contract-cases";

const holder: { db: FakeDb; client: unknown } = { db: {}, client: null };

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return holder.client;
	},
}));

const { GET, POST } = await import("@/app/api/email/unsubscribe/route");

const { accountId, companyId, signature } = UNSUBSCRIBE_CASES[0];
const url = (s = signature) => `https://www.godcode.me/api/email/unsubscribe?a=${accountId}&c=${companyId}&s=${s}`;

beforeEach(() => {
	vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", UNSUBSCRIBE_TEST_SECRET);
	const fake = createFakeSupabase({
		companies: [{ id: companyId, name: "Oishi Sushi", theme_config: { displayName: "" } }],
		menu_client_accounts: [
			{ id: accountId, company_id: companyId, marketing_email_opt_out_at: null },
			{ id: "99999999-2222-4333-8444-555555555555", company_id: companyId, marketing_email_opt_out_at: null },
		],
	});
	holder.db = fake.db;
	holder.client = fake.client;
});

afterEach(() => vi.unstubAllEnvs());

const optOut = (id: string) => holder.db.menu_client_accounts.find((row) => row.id === id)?.marketing_email_opt_out_at;

describe("/api/email/unsubscribe", () => {
	it("GET solo pregunta: abrir el enlace no da de baja", async () => {
		const res = await GET(new NextRequest(url()));

		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain("Oishi Sushi");
		expect(html).toContain('method="post"');
		expect(optOut(accountId)).toBeNull();
	});

	it("POST con firma válida da de baja solo esa cuenta", async () => {
		const res = await POST(new NextRequest(url(), { method: "POST", body: "List-Unsubscribe=One-Click" }));

		expect(res.status).toBe(200);
		expect(optOut(accountId)).toBeTruthy();
		expect(optOut("99999999-2222-4333-8444-555555555555")).toBeNull();
	});

	it("una firma alterada no da de baja a nadie", async () => {
		const res = await POST(new NextRequest(url(signature.slice(0, -1) + "x"), { method: "POST" }));

		expect(res.status).toBe(400);
		expect(optOut(accountId)).toBeNull();
	});

	it("sin secreto configurado falla cerrado", async () => {
		vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "");
		const res = await POST(new NextRequest(url(), { method: "POST" }));

		expect(res.status).toBe(400);
		expect(optOut(accountId)).toBeNull();
	});
});
