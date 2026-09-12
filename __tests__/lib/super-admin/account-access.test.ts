import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock, type TableQueues } from "../menu-account/test-supabase-mock";

const { adminRef } = vi.hoisted(() => ({
	adminRef: { current: null as ReturnType<typeof makeAdminMock> | null },
}));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminRef.current;
	},
}));

vi.mock("../../../lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminRef.current;
	},
}));

function setupTables(tables: TableQueues) {
	const admin = makeAdminMock({ tables });
	adminRef.current = admin;
	return admin;
}

describe("getSuperAdminRoleByEmail", () => {
	beforeEach(() => {
		vi.resetModules();
		adminRef.current = null;
	});

	it("busca con igualdad exacta, nunca con ilike", async () => {
		// Regresión: `ilike` trata `_` como comodín y `_` es válido en un email.
		// Esta función resuelve QUIÉN ES SUPER-ADMIN del SaaS, así que un match
		// espurio es escalada de privilegios: alguien registra `a_b@empresa.com`
		// y hace match contra el `axb@empresa.com` que sí está en `admin_users`.
		const admin = setupTables({
			admin_users: [{ data: null, error: null }],
		});
		const { getSuperAdminRoleByEmail } = await import("@/lib/super-admin/account-access");

		await getSuperAdminRoleByEmail("a_b@empresa.com");

		for (const { chain } of admin.chains) {
			expect(chain.ilike).toBeUndefined();
			const eq = chain.eq as { mock: { calls: unknown[][] } };
			for (const call of eq.mock.calls) {
				if (call[0] === "email") expect(call[1]).toBe("a_b@empresa.com");
			}
		}
	});

	it("no concede rol cuando el correo no coincide exactamente", async () => {
		// El mock devuelve vacío porque `.eq` no matchea; con `ilike` la fila de
		// `axb@empresa.com` habría vuelto y el atacante sería super_admin.
		setupTables({ admin_users: [{ data: null, error: null }] });
		const { getSuperAdminRoleByEmail } = await import("@/lib/super-admin/account-access");

		expect(await getSuperAdminRoleByEmail("a_b@empresa.com")).toBeNull();
	});

	it("normaliza el correo a minúsculas antes de consultar", async () => {
		const admin = setupTables({
			admin_users: [{ data: { role: "super_admin" }, error: null }],
		});
		const { getSuperAdminRoleByEmail } = await import("@/lib/super-admin/account-access");

		expect(await getSuperAdminRoleByEmail("  Admin@Empresa.com  ")).toBe("super_admin");

		const eq = admin.chains[0].chain.eq as { mock: { calls: unknown[][] } };
		expect(eq.mock.calls.find((call) => call[0] === "email")?.[1]).toBe("admin@empresa.com");
	});
});

describe("getCustomerMembership", () => {
	beforeEach(() => {
		vi.resetModules();
		adminRef.current = null;
	});

	it("usa igualdad exacta en el fallback por correo", async () => {
		const admin = setupTables({
			users: [
				{ data: null, error: null },
				{ data: [], error: null },
			],
		});
		const { getCustomerMembership } = await import("@/lib/super-admin/account-access");

		await getCustomerMembership({ authUserId: "auth-1", email: "a_b@empresa.com" });

		for (const { chain } of admin.chains) {
			expect(chain.ilike).toBeUndefined();
		}
	});
});
