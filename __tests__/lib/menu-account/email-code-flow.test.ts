import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "./test-supabase-mock";

const adminHolder: { current: ReturnType<typeof makeAdminMock> } = {
	current: makeAdminMock({ tables: {} }),
};
const mockSignIn = vi.fn();
const mockSignOut = vi.fn(async () => ({ error: null }));
const mockVerifyOnResponse = vi.fn();
const mockSendOtp = vi.fn(async () => ({ error: null }));
const mockVerifyEphemeral = vi.fn();
const mockUpdateUser = vi.fn(async () => ({ data: {}, error: null }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

vi.mock("@/utils/supabase/server", () => ({
	createSupabasePublicServerClient: () => ({
		auth: {
			signInWithOtp: mockSendOtp,
			verifyOtp: mockVerifyEphemeral,
			signOut: vi.fn(async () => ({ error: null })),
		},
	}),
}));

vi.mock("@/lib/menu-account/cookies", () => ({
	createMenuClientResponseClient: () => ({
		auth: { signInWithPassword: mockSignIn, signOut: mockSignOut, verifyOtp: mockVerifyOnResponse },
	}),
}));

import {
	changeMenuAccountPassword,
	loginMenuAccount,
	verifyMenuAccountEmail,
} from "@/lib/menu-account/account-service";

const company = { id: "company-a", name: "Rica Pizza", publicSlug: "rica-pizza", countryCode: "CL" };

/** Cuenta antigua (en claro): el correo sale de la fila sin pasar por auth. */
const ACCOUNT = {
	id: "acc-1",
	company_id: "company-a",
	auth_user_id: "auth-1",
	email: "cliente@gmail.com",
	document_normalized: "123456785",
	document_raw: "12.345.678-5",
	document_country: "CL",
	full_name: "Ana Cliente",
	phone: "+56 9 1234 5678",
	phone_normalized: "56912345678",
	preferred_branch_id: null,
	is_active: true,
};

const UNVERIFIED = { id: "auth-1", app_metadata: { kind: "menu_client" } };

const request = {} as never;
const response = {} as never;

function withAccount() {
	adminHolder.current = makeAdminMock({
		tables: { menu_client_accounts: [{ data: [ACCOUNT], error: null }] },
		authAdmin: { updateUserById: mockUpdateUser },
	});
}

describe("códigos por correo en Mi cuenta", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		withAccount();
	});

	it("login con correo sin confirmar: cierra la sesión, manda código y no entra", async () => {
		mockSignIn.mockResolvedValue({ data: { user: UNVERIFIED }, error: null });

		await expect(
			loginMenuAccount({ company, document: "12.345.678-5", password: "secreta123" }, request, response),
		).rejects.toMatchObject({ code: "email_not_verified" });

		expect(mockSignOut).toHaveBeenCalled();
		expect(mockSendOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "cliente@gmail.com" }));
	});

	it("login con contraseña incorrecta no manda código", async () => {
		mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });

		await expect(
			loginMenuAccount({ company, document: "12.345.678-5", password: "mala" }, request, response),
		).rejects.toMatchObject({ code: "invalid_credentials" });
		expect(mockSendOtp).not.toHaveBeenCalled();
	});

	it("verificar marca el correo como confirmado y devuelve la cuenta", async () => {
		mockVerifyOnResponse.mockResolvedValue({ data: { user: UNVERIFIED }, error: null });

		const account = await verifyMenuAccountEmail(
			{ company, document: "12.345.678-5", code: "123456" },
			request,
			response,
		);

		expect(account.id).toBe("acc-1");
		expect(mockUpdateUser).toHaveBeenCalledWith(
			"auth-1",
			expect.objectContaining({
				app_metadata: expect.objectContaining({ kind: "menu_client", menu_email_verified_at: expect.any(String) }),
			}),
		);
	});

	it("un código de otro usuario no confirma esta cuenta", async () => {
		mockVerifyOnResponse.mockResolvedValue({ data: { user: { id: "auth-otro", app_metadata: {} } }, error: null });

		await expect(
			verifyMenuAccountEmail({ company, document: "12.345.678-5", code: "123456" }, request, response),
		).rejects.toMatchObject({ code: "invalid_code" });
		expect(mockUpdateUser).not.toHaveBeenCalled();
	});

	it("un código inválido se rechaza sin tocar nada", async () => {
		mockVerifyOnResponse.mockResolvedValue({ data: { user: null }, error: { message: "Token has expired or is invalid" } });

		await expect(
			verifyMenuAccountEmail({ company, document: "12.345.678-5", code: "000000" }, request, response),
		).rejects.toMatchObject({ code: "invalid_code" });
		expect(mockUpdateUser).not.toHaveBeenCalled();
	});

	it("cambiar la contraseña exige un código válido del mismo usuario", async () => {
		mockVerifyEphemeral.mockResolvedValue({ data: { user: { id: "auth-otro" } }, error: null });

		await expect(
			changeMenuAccountPassword({
				account: ACCOUNT as never,
				authUserId: "auth-1",
				code: "123456",
				newPassword: "nueva-clave-1",
			}),
		).rejects.toMatchObject({ code: "invalid_code" });
		expect(mockUpdateUser).not.toHaveBeenCalled();

		mockVerifyEphemeral.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
		await changeMenuAccountPassword({
			account: ACCOUNT as never,
			authUserId: "auth-1",
			code: "123456",
			newPassword: "nueva-clave-1",
		});
		expect(mockUpdateUser).toHaveBeenCalledWith("auth-1", { password: "nueva-clave-1" });
	});
});
