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
import { isSealedPii, openPii, sealPii } from "@/lib/menu-account/pii";
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

	it("crea una ficha nueva con nombre corto y contacto cifrado, sin buscar fichas históricas", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				clients: [{ data: { id: "client-new" }, error: null }],
				menu_client_accounts: [{ data: { client_id: "client-new" }, error: null }],
			},
		});

		await expect(ensureMenuAccountClient(account())).resolves.toBe("client-new");

		const [insert] = chainsFor("clients");
		const row = (insert.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
		expect(row).toMatchObject({ company_id: "company-a", name: "Ana C.", phone_normalized: null });
		expect(openPii(String(row.phone))).toBe("+56 9 1234 5678");
		expect(openPii(String(row.rut))).toBe("12.345.678-5");
		// Nada legible de la cuenta queda en la ficha salvo el nombre corto.
		expect(JSON.stringify(row)).not.toMatch(/Cliente|1234 5678|12\.345/);
		// El reclamo es condicional: solo gana si la cuenta seguía sin ficha.
		const [claim] = chainsFor("menu_client_accounts");
		expect(claim.is).toHaveBeenCalledWith("client_id", null);
	});

	it("cifra al usarla una ficha de antes del cifrado", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				clients: [
					{
						data: {
							id: "client-1",
							name: "Ana Cliente",
							phone: "+56 9 1234 5678",
							phone_normalized: "56912345678",
							rut: "12.345.678-5",
						},
						error: null,
					},
					emptyResult,
				],
			},
		});

		await expect(ensureMenuAccountClient(account({ client_id: "client-1" }))).resolves.toBe("client-1");

		const [, update] = chainsFor("clients");
		const patch = (update.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
		expect(patch).toMatchObject({ name: "Ana C.", phone_normalized: null });
		expect(isSealedPii(String(patch.phone))).toBe(true);
		expect(isSealedPii(String(patch.rut))).toBe(true);
		expect(update.eq).toHaveBeenCalledWith("company_id", "company-a");
	});

	it("no reescribe una ficha que ya está cifrada y al día", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				clients: [
					{
						data: {
							id: "client-1",
							name: "Ana C.",
							phone: sealPii("+56 9 1234 5678"),
							phone_normalized: null,
							rut: sealPii("12.345.678-5"),
						},
						error: null,
					},
				],
			},
		});

		await ensureMenuAccountClient(account({ client_id: "client-1" }));
		expect(chainsFor("clients")).toHaveLength(1);
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
