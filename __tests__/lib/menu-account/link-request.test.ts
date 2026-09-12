import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock, emptyResult } from "./test-supabase-mock";

const adminHolder: { current: ReturnType<typeof makeAdminMock> } = {
	current: makeAdminMock({ tables: {} }),
};

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

vi.mock("@/utils/supabase/server", () => ({
	createSupabasePublicServerClient: () => ({ auth: {} }),
}));

vi.mock("@/lib/menu-account/cookies", () => ({
	createMenuClientResponseClient: () => ({ auth: {} }),
}));

import { consumeLinkRequest } from "@/lib/menu-account/account-service";

const HOUR = 60 * 60 * 1000;

function baseLinkRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "link-1",
		auth_user_id: "auth-owner",
		company_id: "company-b",
		email: "cliente@gmail.com",
		document_normalized: "123456785",
		document_raw: "12.345.678-5",
		document_country: "CL",
		full_name: "Ana Cliente",
		phone: "+56 9 1234 5678",
		phone_normalized: "56912345678",
		preferred_branch_id: null,
		expires_at: new Date(Date.now() + HOUR).toISOString(),
		consumed_at: null,
		...overrides,
	};
}

function setup(linkRequest: unknown, extra: Record<string, unknown[]> = {}) {
	adminHolder.current = makeAdminMock({
		tables: {
			menu_client_link_requests: [{ data: linkRequest, error: null }, emptyResult],
			menu_client_accounts: [emptyResult],
			companies: [{ data: { public_slug: "negocio-b" }, error: null }],
			...extra,
		},
	});
	return adminHolder.current;
}

describe("consumeLinkRequest", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("crea la cuenta cuando la solicitud es válida y el dueño coincide", async () => {
		const admin = setup(baseLinkRequest());
		const result = await consumeLinkRequest("link-1", "auth-owner");

		expect(result.companySlug).toBe("negocio-b");
		expect(admin.fromCalls).toContain("menu_client_accounts");
	});

	it("rechaza una solicitud de otra persona", async () => {
		// El auth_user_id viene de la sesión recién canjeada, no de la URL: esto es
		// lo que impide confirmar la vinculación de un tercero manipulando `link=`.
		const admin = setup(baseLinkRequest());
		await expect(consumeLinkRequest("link-1", "auth-intruso")).rejects.toMatchObject({
			code: "link_invalid",
		});
		expect(admin.fromCalls).not.toContain("menu_client_accounts");
	});

	it("rechaza una solicitud ya consumida", async () => {
		setup(baseLinkRequest({ consumed_at: new Date().toISOString() }));
		await expect(consumeLinkRequest("link-1", "auth-owner")).rejects.toMatchObject({
			code: "link_invalid",
		});
	});

	it("rechaza una solicitud caducada", async () => {
		setup(baseLinkRequest({ expires_at: new Date(Date.now() - HOUR).toISOString() }));
		await expect(consumeLinkRequest("link-1", "auth-owner")).rejects.toMatchObject({
			code: "link_invalid",
		});
	});

	it("rechaza una solicitud inexistente", async () => {
		setup(null);
		await expect(consumeLinkRequest("link-x", "auth-owner")).rejects.toMatchObject({
			code: "link_invalid",
		});
	});

	it("tolera que la cuenta ya exista (doble clic en el enlace)", async () => {
		setup(baseLinkRequest(), {
			menu_client_accounts: [{ data: null, error: { code: "23505" } }],
		});
		await expect(consumeLinkRequest("link-1", "auth-owner")).resolves.toMatchObject({
			companySlug: "negocio-b",
		});
	});
});
