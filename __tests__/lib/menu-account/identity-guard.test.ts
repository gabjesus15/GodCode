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

import { classifyEmail, normalizeEmail } from "@/lib/menu-account/identity-guard";

/** Tablas que consulta `classifyEmail`, en el orden en que las toca. */
function setupTables(overrides: {
	adminUsers?: unknown;
	users?: unknown[];
	menuAccounts?: unknown;
	authUsers?: Array<{ id: string; email: string; app_metadata?: Record<string, unknown> }>;
}) {
	adminHolder.current = makeAdminMock({
		tables: {
			admin_users: [overrides.adminUsers ?? emptyResult],
			users: overrides.users ?? [emptyResult, emptyResult],
			menu_client_accounts: [overrides.menuAccounts ?? emptyResult],
		},
		listUsers: { data: { users: overrides.authUsers ?? [] }, error: null },
	});
	return adminHolder.current;
}

describe("normalizeEmail", () => {
	it("recorta y pasa a minúsculas", () => {
		expect(normalizeEmail("  Juan.Perez@Gmail.COM ")).toBe("juan.perez@gmail.com");
		expect(normalizeEmail(null)).toBe("");
	});
});

describe("classifyEmail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("marca como staff un correo de admin_users", async () => {
		setupTables({ adminUsers: { data: { id: "admin-1" }, error: null } });
		expect(await classifyEmail("ceo@negocio.cl")).toEqual({
			ownership: "staff",
			authUserId: null,
		});
	});

	it("marca como staff un correo de public.users", async () => {
		setupTables({ users: [{ data: { id: "user-1" }, error: null }] });
		expect(await classifyEmail("cajero@negocio.cl")).toEqual({
			ownership: "staff",
			authUserId: null,
		});
	});

	it("marca como menu_client un correo que ya tiene cuenta", async () => {
		setupTables({
			menuAccounts: { data: { auth_user_id: "auth-42" }, error: null },
		});
		expect(await classifyEmail("cliente@gmail.com")).toEqual({
			ownership: "menu_client",
			authUserId: "auth-42",
		});
	});

	it("marca como free un correo que no aparece en ningún lado", async () => {
		setupTables({});
		expect(await classifyEmail("nuevo@gmail.com")).toEqual({
			ownership: "free",
			authUserId: null,
		});
	});

	it("marca como foreign un auth.users ajeno que no creamos nosotros", async () => {
		setupTables({
			authUsers: [{ id: "auth-99", email: "ajeno@gmail.com", app_metadata: {} }],
		});
		expect(await classifyEmail("ajeno@gmail.com")).toEqual({
			ownership: "foreign",
			authUserId: null,
		});
	});

	it("reconoce un cliente del menú que solo existe en auth.users", async () => {
		setupTables({
			authUsers: [
				{ id: "auth-7", email: "medias@gmail.com", app_metadata: { kind: "menu_client" } },
			],
		});
		expect(await classifyEmail("medias@gmail.com")).toEqual({
			ownership: "menu_client",
			authUserId: "auth-7",
		});
	});

	it("busca con igualdad exacta, nunca con ilike", async () => {
		// Regresión: en PostgREST `ilike` trata `_` como comodín, y los correos
		// reales lo contienen de forma legítima. `juan_perez@` no debe poder hacer
		// match contra `juanXperez@`.
		const admin = setupTables({});
		await classifyEmail("juan_perez@gmail.com");

		for (const { chain } of admin.chains) {
			const ilike = chain.ilike as { mock?: unknown } | undefined;
			expect(ilike).toBeUndefined();
			const eq = chain.eq as { mock: { calls: unknown[][] } };
			const usedValues = eq.mock.calls.map((call) => call[1]);
			for (const value of usedValues) {
				if (typeof value === "string" && value.includes("@")) {
					expect(value).toBe("juan_perez@gmail.com");
				}
			}
		}
	});

	it("no consulta auth.users si el correo ya apareció como staff", async () => {
		const admin = setupTables({ adminUsers: { data: { id: "admin-1" }, error: null } });
		await classifyEmail("ceo@negocio.cl");
		expect(admin.auth.admin.listUsers).not.toHaveBeenCalled();
	});
});
