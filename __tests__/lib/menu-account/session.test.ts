import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock, emptyResult } from "./test-supabase-mock";

const mockGetUser = vi.fn();
const adminHolder: { current: ReturnType<typeof makeAdminMock> } = {
	current: makeAdminMock({ tables: {} }),
};

vi.mock("@/utils/supabase/server", () => ({
	createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

import { getMenuAccountSession, requireMenuAccount, toMenuAccountDto } from "@/lib/menu-account/session";

const ACCOUNT = {
	id: "acc-1",
	company_id: "company-a",
	auth_user_id: "auth-1",
	email: "cliente@gmail.com",
	document_normalized: "123456785",
	document_country: "CL",
	full_name: "Ana Cliente",
	phone: "+56 9 1234 5678",
	preferred_branch_id: "branch-1",
	is_active: true,
};

function setAccountRow(row: unknown) {
	adminHolder.current = makeAdminMock({
		tables: { menu_client_accounts: [row ?? emptyResult] },
	});
}

describe("getMenuAccountSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
	});

	it("devuelve la cuenta cuando la sesión corresponde a este negocio", async () => {
		setAccountRow({ data: ACCOUNT, error: null });
		const session = await getMenuAccountSession("company-a");
		expect(session?.authUserId).toBe("auth-1");
		expect(session?.account.id).toBe("acc-1");
	});

	it("devuelve null si no hay sesión", async () => {
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
		setAccountRow({ data: ACCOUNT, error: null });
		expect(await getMenuAccountSession("company-a")).toBeNull();
	});

	it("devuelve null si la cuenta es de otro negocio", async () => {
		// La consulta filtra por company_id, así que no encuentra fila. Es el guard
		// del caso dominio principal, donde todos los negocios comparten cookie.
		setAccountRow(emptyResult);
		expect(await getMenuAccountSession("company-b")).toBeNull();
	});

	it("filtra siempre por company_id además de por auth_user_id", async () => {
		setAccountRow({ data: ACCOUNT, error: null });
		await getMenuAccountSession("company-a");

		const chain = adminHolder.current.chains[0]?.chain as {
			eq: { mock: { calls: unknown[][] } };
		};
		const filtered = chain.eq.mock.calls.map((call) => call[0]);
		expect(filtered).toContain("auth_user_id");
		expect(filtered).toContain("company_id");
	});

	it("devuelve null si la cuenta está desactivada", async () => {
		setAccountRow({ data: { ...ACCOUNT, is_active: false }, error: null });
		expect(await getMenuAccountSession("company-a")).toBeNull();
	});
});

describe("requireMenuAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
	});

	it("lanza 401 cuando no hay sesión válida", async () => {
		setAccountRow(emptyResult);
		await expect(requireMenuAccount("company-a")).rejects.toMatchObject({
			status: 401,
			code: "unauthorized",
		});
	});
});

describe("toMenuAccountDto", () => {
	it("enmascara el documento y omite los identificadores internos", () => {
		const dto = toMenuAccountDto(ACCOUNT as never);
		expect(dto.documentMasked).toBe("12······5");
		expect(dto).not.toHaveProperty("auth_user_id");
		expect(dto).not.toHaveProperty("client_id");
		expect(Object.keys(dto).sort()).toEqual([
			"documentCountry",
			"documentMasked",
			"email",
			"fullName",
			"id",
			"phone",
			"preferredBranchId",
		]);
	});
});
