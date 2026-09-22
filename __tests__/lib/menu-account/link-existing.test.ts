import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock, emptyResult } from "./test-supabase-mock";

const adminHolder: { current: ReturnType<typeof makeAdminMock> } = {
	current: makeAdminMock({ tables: {} }),
};
const mockSignIn = vi.fn();
const mockSignOut = vi.fn(async () => ({ error: null }));
const mockSendOtp = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

vi.mock("@/utils/supabase/server", () => ({
	createSupabasePublicServerClient: () => ({ auth: { signInWithOtp: mockSendOtp } }),
}));

vi.mock("@/lib/menu-account/cookies", () => ({
	createMenuClientResponseClient: () => ({
		auth: { signInWithPassword: mockSignIn, signOut: mockSignOut },
	}),
}));

const VERIFIED_OWNER = {
	id: "auth-owner",
	app_metadata: { kind: "menu_client", menu_email_verified_at: "2026-09-22T00:00:00.000Z" },
};

vi.mock("@/lib/menu-account/identity-guard", () => ({
	normalizeEmail: (value: string) => value.trim().toLowerCase(),
	classifyEmail: async () => ({ ownership: "menu_client", authUserId: "auth-owner" }),
}));

import { registerMenuAccount } from "@/lib/menu-account/account-service";

const company = { id: "company-b", name: "Oishi", publicSlug: "oishi", countryCode: "CL" };

const input = {
	company,
	document: "12.345.678-5",
	email: "cliente@gmail.com",
	password: "clave-de-su-cuenta",
	fullName: "Ana Cliente",
	phone: "+56 9 1234 5678",
};

const request = {} as never;
const response = {} as never;

/**
 * Sin correos, vincular un negocio nuevo a una persona que ya tiene cuenta exige su
 * contraseña. Lo que importa es que sin ella no se crea nada ni se toca la clave.
 */
describe("registerMenuAccount con un correo que ya es cliente", () => {
	beforeEach(() => {
		mockSignIn.mockReset();
		mockSignOut.mockClear();
		mockSendOtp.mockClear();
	});

	const linkedRow = { data: { id: "acc-new", company_id: "company-b", document_normalized: "123456785", full_name: "Ana Cliente", email: "cliente@gmail.com", phone: "+56 9 1234 5678" }, error: null };

	it("vincula el negocio si la contraseña es la de la cuenta", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				menu_client_accounts: [
					emptyResult, // sin cuenta en este negocio
					emptyResult, // documento libre
					linkedRow,
					emptyResult, // last_login_at
				],
			},
		});
		mockSignIn.mockResolvedValue({ data: { user: VERIFIED_OWNER }, error: null });

		const result = await registerMenuAccount(input, request, response);

		expect(result.status).toBe("linked");
		expect(mockSendOtp).not.toHaveBeenCalled();
		const insert = adminHolder.current.chains.find((c) => c.table === "menu_client_accounts" && (c.chain.insert as ReturnType<typeof vi.fn>).mock.calls.length > 0);
		expect(insert?.chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({ auth_user_id: "auth-owner", company_id: "company-b" }),
		);
		expect(adminHolder.current.auth.admin).not.toHaveProperty("updateUserById");
	});

	it("sin correo confirmado no deja la sesión abierta y manda el código", async () => {
		adminHolder.current = makeAdminMock({
			tables: { menu_client_accounts: [emptyResult, emptyResult, linkedRow] },
		});
		mockSignIn.mockResolvedValue({
			data: { user: { id: "auth-owner", app_metadata: { kind: "menu_client" } } },
			error: null,
		});

		const result = await registerMenuAccount(input, request, response);

		expect(result).toEqual({ status: "verification_required" });
		expect(mockSignOut).toHaveBeenCalled();
		expect(mockSendOtp).toHaveBeenCalledWith(
			expect.objectContaining({ email: "cliente@gmail.com", options: { shouldCreateUser: false } }),
		);
	});

	it("rechaza sin crear nada si la contraseña no coincide", async () => {
		adminHolder.current = makeAdminMock({
			tables: { menu_client_accounts: [emptyResult, emptyResult] },
		});
		mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });

		await expect(registerMenuAccount(input, request, response)).rejects.toMatchObject({
			code: "link_password_mismatch",
		});
		const inserted = adminHolder.current.chains.some(
			(c) => (c.chain.insert as ReturnType<typeof vi.fn>).mock.calls.length > 0,
		);
		expect(inserted).toBe(false);
	});

	it("rechaza si ya tiene cuenta en este negocio, sin probar la contraseña", async () => {
		adminHolder.current = makeAdminMock({
			tables: { menu_client_accounts: [{ data: { id: "acc-1" }, error: null }] },
		});

		await expect(registerMenuAccount(input, request, response)).rejects.toMatchObject({
			code: "already_registered",
		});
		expect(mockSignIn).not.toHaveBeenCalled();
	});
});
