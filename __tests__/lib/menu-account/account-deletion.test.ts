import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "./test-supabase-mock";

const adminHolder: { current: ReturnType<typeof makeAdminMock> } = {
	current: makeAdminMock({ tables: {} }),
};

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

const verifyEmailCode = vi.fn();
vi.mock("@/lib/menu-account/email-code", () => ({
	verifyEmailCode: (...args: unknown[]) => verifyEmailCode(...args),
	sendEmailCode: vi.fn(async () => undefined),
}));

import {
	DELETED_CLIENT_NAME,
	deleteMenuAccount,
	deleteMenuIdentity,
} from "@/lib/menu-account/account-deletion";
import { MenuAccountError } from "@/lib/menu-account/errors";
import type { MenuClientAccountRow } from "@/lib/menu-account/types";

const ok = { data: null, error: null };

function account(overrides: Partial<MenuClientAccountRow> = {}): MenuClientAccountRow {
	return {
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
		client_id: "client-1",
		preferred_branch_id: null,
		is_active: true,
		last_login_at: null,
		reset_grant_expires_at: null,
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		...overrides,
	} as MenuClientAccountRow;
}

function chainsFor(table: string) {
	return adminHolder.current.chains.filter((entry) => entry.table === table).map((entry) => entry.chain);
}

function fullDeletionMock(remainingAccounts: { count: number | null; error: unknown }) {
	return makeAdminMock({
		tables: {
			client_addresses: [ok],
			clients: [ok],
			menu_client_link_requests: [ok],
			menu_client_accounts: [ok, remainingAccounts],
		},
	});
}

describe("deleteMenuAccount", () => {
	beforeEach(() => {
		verifyEmailCode.mockReset();
		verifyEmailCode.mockResolvedValue({ id: "auth-1" });
	});

	it("no borra nada si el código no es válido", async () => {
		adminHolder.current = makeAdminMock({ tables: {} });
		verifyEmailCode.mockRejectedValue(new MenuAccountError(400, "invalid_code", "x"));

		await expect(
			deleteMenuAccount({ account: account(), authUserId: "auth-1", code: "123456" }),
		).rejects.toMatchObject({ code: "invalid_code" });
		expect(adminHolder.current.fromCalls).toEqual([]);
	});

	it("rechaza un código válido de otra persona", async () => {
		adminHolder.current = makeAdminMock({ tables: {} });
		verifyEmailCode.mockResolvedValue({ id: "auth-otro" });

		await expect(
			deleteMenuAccount({ account: account(), authUserId: "auth-1", code: "123456" }),
		).rejects.toMatchObject({ code: "invalid_code" });
		expect(adminHolder.current.fromCalls).toEqual([]);
	});

	it("borra cuenta y direcciones, deja la ficha sin datos personales y la fila de la cuenta al final", async () => {
		adminHolder.current = fullDeletionMock({ count: 0, error: null });

		await expect(
			deleteMenuAccount({ account: account(), authUserId: "auth-1", code: "123456" }),
		).resolves.toEqual({ lastAccount: true });

		expect(verifyEmailCode).toHaveBeenCalledWith("cliente@gmail.com", "123456", "email");
		expect(adminHolder.current.fromCalls).toEqual([
			"client_addresses",
			"clients",
			"menu_client_link_requests",
			"menu_client_accounts",
			"menu_client_accounts",
		]);

		const [addresses] = chainsFor("client_addresses");
		expect(addresses.delete).toHaveBeenCalled();
		expect(addresses.eq).toHaveBeenCalledWith("client_id", "client-1");
		expect(addresses.eq).toHaveBeenCalledWith("company_id", "company-a");

		const [client] = chainsFor("clients");
		const patch = (client.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
		expect(patch).toMatchObject({
			name: DELETED_CLIENT_NAME,
			phone: "",
			phone_normalized: null,
			rut: null,
			default_delivery_address: null,
		});
		expect(client.eq).toHaveBeenCalledWith("company_id", "company-a");

		const [linkRequests] = chainsFor("menu_client_link_requests");
		expect(linkRequests.eq).toHaveBeenCalledWith("auth_user_id", "auth-1");
		expect(linkRequests.eq).toHaveBeenCalledWith("company_id", "company-a");

		const [removal] = chainsFor("menu_client_accounts");
		expect(removal.delete).toHaveBeenCalled();
		expect(removal.eq).toHaveBeenCalledWith("id", "acc-1");
		expect(removal.eq).toHaveBeenCalledWith("company_id", "company-a");
	});

	it("sin ficha vinculada solo borra la cuenta", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				menu_client_link_requests: [ok],
				menu_client_accounts: [ok, { count: 0, error: null }],
			},
		});

		await deleteMenuAccount({ account: account({ client_id: null }), authUserId: "auth-1", code: "123456" });
		expect(adminHolder.current.fromCalls).not.toContain("clients");
		expect(adminHolder.current.fromCalls).not.toContain("client_addresses");
	});

	it("conserva el usuario si la persona tiene cuenta en otro negocio", async () => {
		adminHolder.current = fullDeletionMock({ count: 1, error: null });

		await expect(
			deleteMenuAccount({ account: account(), authUserId: "auth-1", code: "123456" }),
		).resolves.toEqual({ lastAccount: false });
	});

	it("ante un error al contar las cuentas restantes, conserva el usuario", async () => {
		adminHolder.current = fullDeletionMock({ count: null, error: { message: "boom" } });

		await expect(
			deleteMenuAccount({ account: account(), authUserId: "auth-1", code: "123456" }),
		).resolves.toEqual({ lastAccount: false });
	});

	it("si falla un paso, corta con error interno sin borrar la cuenta", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				client_addresses: [{ data: null, error: { message: "boom" } }],
				menu_client_accounts: [ok],
			},
		});

		await expect(
			deleteMenuAccount({ account: account(), authUserId: "auth-1", code: "123456" }),
		).rejects.toMatchObject({ code: "internal" });
		expect(adminHolder.current.fromCalls).not.toContain("menu_client_accounts");
	});
});

describe("deleteMenuIdentity", () => {
	it("borra el usuario de auth de un cliente del menú", async () => {
		const deleteUser = vi.fn(async () => ({ error: null }));
		adminHolder.current = makeAdminMock({
			tables: {},
			authAdmin: {
				getUserById: vi.fn(async () => ({ data: { user: { id: "auth-1", app_metadata: { kind: "menu_client" } } } })),
				deleteUser,
			},
		});

		await deleteMenuIdentity("auth-1");
		expect(deleteUser).toHaveBeenCalledWith("auth-1");
	});

	it("nunca borra un usuario que no se creó como cliente del menú", async () => {
		const deleteUser = vi.fn(async () => ({ error: null }));
		adminHolder.current = makeAdminMock({
			tables: {},
			authAdmin: {
				getUserById: vi.fn(async () => ({ data: { user: { id: "auth-1", app_metadata: {} } } })),
				deleteUser,
			},
		});

		await deleteMenuIdentity("auth-1");
		expect(deleteUser).not.toHaveBeenCalled();
	});
});
