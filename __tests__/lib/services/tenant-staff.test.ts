import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock, type TableQueues } from "../menu-account/test-supabase-mock";

const { adminRef, scopedRef, getUserMock } = vi.hoisted(() => ({
	adminRef: { current: null as ReturnType<typeof makeAdminMock> | null },
	scopedRef: { current: null as ReturnType<typeof makeAdminMock> | null },
	getUserMock: vi.fn(),
}));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminRef.current;
	},
}));

vi.mock("@/utils/supabase/server", () => ({
	createSupabaseServerClient: async () => ({
		auth: { getUser: getUserMock },
		from: (table: string) => scopedRef.current!.from(table),
	}),
}));

function setup(scoped: TableQueues, admin: TableQueues) {
	scopedRef.current = makeAdminMock({ tables: scoped });
	adminRef.current = makeAdminMock({ tables: admin });
	return { scoped: scopedRef.current, admin: adminRef.current };
}

describe("TenantStaffService.getCeoSession", () => {
	beforeEach(() => {
		vi.resetModules();
		getUserMock.mockReset();
	});

	it("busca con igualdad exacta, nunca con ilike", async () => {
		// Regresión: `a_b@empresa.com` no debe matchear `axb@empresa.com`, que
		// puede ser el CEO de OTRA empresa. Tras el lookup se opera con
		// supabaseAdmin (service_role), que ignora la RLS.
		getUserMock.mockResolvedValue({
			data: { user: { email: "a_b@empresa.com" } },
			error: null,
		});
		const { scoped, admin } = setup(
			{ users: [{ data: [], error: null }] },
			{ users: [{ data: [], error: null }] },
		);
		const { TenantStaffService } = await import("@/lib/services/tenant-staff.service");

		await expect(TenantStaffService.getCeoSession()).rejects.toThrow();

		for (const { chain } of [...scoped.chains, ...admin.chains]) {
			expect(chain.ilike).toBeUndefined();
			const eq = chain.eq as { mock: { calls: unknown[][] } };
			for (const call of eq.mock.calls) {
				if (call[0] === "email") expect(call[1]).toBe("a_b@empresa.com");
			}
		}
	});

	it("normaliza el correo del JWT a minúsculas en ambas lecturas", async () => {
		// Antes sólo se hacía `.trim()`. Con `ilike` el matcheo toleraba las
		// mayúsculas; con `.eq` sobre una columna `text` deja de hacerlo, así que
		// el `.toLowerCase()` pasa a ser obligatorio y no cosmético.
		getUserMock.mockResolvedValue({
			data: { user: { email: "  CEO@Empresa.com  " } },
			error: null,
		});
		const { scoped, admin } = setup(
			{ users: [{ data: null, error: { message: "rls" } }] },
			{ users: [{ data: [{ id: "u1", company_id: "c1", role: "ceo" }], error: null }] },
		);
		const { TenantStaffService } = await import("@/lib/services/tenant-staff.service");

		const session = await TenantStaffService.getCeoSession();
		expect(session).toEqual({ companyId: "c1", userId: "u1" });

		// Las dos rutas (cliente scoped y fallback admin) usan el correo normalizado.
		for (const { chain } of [...scoped.chains, ...admin.chains]) {
			const eq = chain.eq as { mock: { calls: unknown[][] } };
			const emailCall = eq.mock.calls.find((call) => call[0] === "email");
			if (emailCall) expect(emailCall[1]).toBe("ceo@empresa.com");
		}
	});
});
