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

import { ensureMenuAccountClient } from "@/lib/menu-account/client-link";
import type { MenuClientAccountRow } from "@/lib/menu-account/types";

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
		client_id: null,
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

describe("ensureMenuAccountClient", () => {
	beforeEach(() => {
		adminHolder.current = makeAdminMock({ tables: {} });
	});

	it("reutiliza la ficha vinculada si es del mismo negocio", async () => {
		adminHolder.current = makeAdminMock({
			tables: { clients: [{ data: { id: "client-1" }, error: null }] },
		});

		await expect(ensureMenuAccountClient(account({ client_id: "client-1" }))).resolves.toBe("client-1");

		const [lookup] = chainsFor("clients");
		expect(lookup.eq).toHaveBeenCalledWith("company_id", "company-a");
		expect(adminHolder.current.fromCalls).not.toContain("menu_client_accounts");
	});

	it("crea una ficha nueva con los datos de la cuenta, sin buscar fichas históricas", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				clients: [{ data: { id: "client-new" }, error: null }],
				menu_client_accounts: [{ data: { client_id: "client-new" }, error: null }],
			},
		});

		await expect(ensureMenuAccountClient(account())).resolves.toBe("client-new");

		const [insert] = chainsFor("clients");
		expect(insert.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				company_id: "company-a",
				name: "Ana Cliente",
				rut: "12.345.678-5",
				phone_normalized: "56912345678",
			}),
		);
		// El reclamo es condicional: solo gana si la cuenta seguía sin ficha.
		const [claim] = chainsFor("menu_client_accounts");
		expect(claim.is).toHaveBeenCalledWith("client_id", null);
	});

	it("si otra petición ganó la carrera, borra su ficha y adopta la ganadora", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				clients: [{ data: { id: "client-loser" }, error: null }, emptyResult],
				menu_client_accounts: [emptyResult, { data: { client_id: "client-winner" }, error: null }],
			},
		});

		await expect(ensureMenuAccountClient(account())).resolves.toBe("client-winner");

		const [, cleanup] = chainsFor("clients");
		expect(cleanup.delete).toHaveBeenCalled();
		expect(cleanup.eq).toHaveBeenCalledWith("id", "client-loser");
	});

	it("falla con error interno si no puede crear la ficha", async () => {
		adminHolder.current = makeAdminMock({
			tables: { clients: [{ data: null, error: { message: "boom" } }] },
		});

		await expect(ensureMenuAccountClient(account())).rejects.toMatchObject({ code: "internal" });
	});
});
