import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock, type TableQueues } from "../../lib/menu-account/test-supabase-mock";

const { adminRef, getUserMock } = vi.hoisted(() => ({
	adminRef: { current: null as ReturnType<typeof makeAdminMock> | null },
	getUserMock: vi.fn(),
}));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminRef.current;
	},
}));

vi.mock("@/utils/supabase/server", () => ({
	createSupabaseServerClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("../../../utils/supabase/server", () => ({
	createSupabaseServerClient: async () => ({ auth: { getUser: getUserMock } }),
}));

function setupTables(tables: TableQueues) {
	const admin = makeAdminMock({ tables });
	adminRef.current = admin;
	return admin;
}

describe("validateAdminRolesOnServer", () => {
	beforeEach(() => {
		vi.resetModules();
		adminRef.current = null;
		getUserMock.mockReset();
	});

	it("busca en admin_users con igualdad exacta, nunca con ilike", async () => {
		// Regresión: este es el gate de permisos SaaS. Con `ilike`, el `_` de
		// `a_b@empresa.com` matchea el `axb@empresa.com` que sí es super_admin.
		getUserMock.mockResolvedValue({
			data: { user: { email: "a_b@empresa.com" } },
			error: null,
		});
		const admin = setupTables({ admin_users: [{ data: null, error: null }] });
		const { validateAdminRolesOnServer } = await import("@/utils/admin/server-auth");

		const result = await validateAdminRolesOnServer(["super_admin"]);

		expect(result.ok).toBe(false);
		expect(result.status).toBe(403);
		for (const { chain } of admin.chains) {
			expect(chain.ilike).toBeUndefined();
			const eq = chain.eq as { mock: { calls: unknown[][] } };
			for (const call of eq.mock.calls) {
				if (call[0] === "email") expect(call[1]).toBe("a_b@empresa.com");
			}
		}
	});

	it("concede acceso al correo que coincide exactamente", async () => {
		getUserMock.mockResolvedValue({
			data: { user: { email: "Admin@Empresa.com" } },
			error: null,
		});
		const admin = setupTables({
			admin_users: [{ data: { role: "super_admin" }, error: null }],
		});
		const { validateAdminRolesOnServer } = await import("@/utils/admin/server-auth");

		const result = await validateAdminRolesOnServer(["super_admin"]);

		expect(result.ok).toBe(true);
		expect(result.role).toBe("super_admin");
		// El correo del JWT llega con mayúsculas y debe consultarse normalizado.
		const eq = admin.chains[0].chain.eq as { mock: { calls: unknown[][] } };
		expect(eq.mock.calls.find((call) => call[0] === "email")?.[1]).toBe("admin@empresa.com");
	});

	it("rechaza un rol que no está en la lista permitida", async () => {
		getUserMock.mockResolvedValue({
			data: { user: { email: "support@empresa.com" } },
			error: null,
		});
		setupTables({ admin_users: [{ data: { role: "support" }, error: null }] });
		const { validateAdminRolesOnServer } = await import("@/utils/admin/server-auth");

		const result = await validateAdminRolesOnServer(["super_admin"]);

		expect(result.ok).toBe(false);
		expect(result.status).toBe(403);
	});
});
