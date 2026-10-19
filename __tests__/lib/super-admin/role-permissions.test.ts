import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const adminHolder = { current: makeAdminMock({ tables: {} }) };
vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));
vi.mock("@/utils/admin/server-auth", () => ({
	SAAS_READ_ROLES: ["super_admin", "support"],
	SAAS_MUTATE_ROLES: ["super_admin"],
	validateSuperAdminAccess: vi.fn(async () => ({ ok: true, email: "admin@example.com" })),
}));
const logAdminAudit = vi.fn(async () => undefined);
vi.mock("@/lib/super-admin/admin-audit", () => ({
	logAdminAudit: (...args: unknown[]) => logAdminAudit(...(args as [])),
}));

import { GET, PATCH } from "@/app/api/super-admin/roles/route";
import { isFullAccessRole, sanitizeRoleActions, sanitizeRoleNavTabs } from "@/lib/super-admin/role-permissions";

const patch = (body: unknown) =>
	PATCH(
		new NextRequest("http://localhost/api/super-admin/roles", {
			method: "PATCH",
			body: JSON.stringify(body),
			headers: { "Content-Type": "application/json" },
		}),
	);

beforeEach(() => {
	logAdminAudit.mockClear();
});

describe("limpieza de permisos de rol", () => {
	it("deja solo pestañas del panel, sin repetir", () => {
		expect(sanitizeRoleNavTabs(["orders", "coupons", "orders", "users", "payment_methods", "nada", 3])).toEqual([
			"orders",
			"coupons",
		]);
		expect(sanitizeRoleNavTabs("orders")).toEqual([]);
	});

	it("deja solo acciones conocidas, sin repetir", () => {
		expect(sanitizeRoleActions(["orders.refund", "orders.refund", "borrar_todo", "coupons.send_email"])).toEqual([
			"orders.refund",
			"coupons.send_email",
		]);
	});

	it("owner ya no existe: no tiene acceso total", () => {
		expect(isFullAccessRole("owner")).toBe(false);
		expect(isFullAccessRole(" CEO ")).toBe(true);
	});
});

describe("PATCH /api/super-admin/roles", () => {
	it("guarda pestañas y acciones del cajero, limpias, y lo audita", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				role_definitions: [
					{ data: { id: "r-cashier", name: "cashier" }, error: null },
					{ data: null, error: null },
				],
			},
		});
		const res = await patch({
			id: "r-cashier",
			navTabs: ["orders", "caja", "coupons", "inventado"],
			actions: ["loyalty_rewards.manage", "hackear"],
		});
		expect(res.status).toBe(200);
		const update = adminHolder.current.chains[1].chain.update;
		expect(update).toHaveBeenCalledWith({
			nav_tabs: ["orders", "caja", "coupons"],
			actions: ["loyalty_rewards.manage"],
		});
		expect(adminHolder.current.chains[1].chain.eq).toHaveBeenCalledWith("id", "r-cashier");
		expect(logAdminAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "role.permissions.update", resourceId: "r-cashier" }),
		);
	});

	it.each(["admin", "ceo", "super_admin"])("no deja recortar a %s", async (name) => {
		adminHolder.current = makeAdminMock({
			tables: { role_definitions: [{ data: { id: "r1", name }, error: null }] },
		});
		const res = await patch({ id: "r1", navTabs: [], actions: [] });
		expect(res.status).toBe(400);
		expect(adminHolder.current.chains).toHaveLength(1);
		expect(logAdminAudit).not.toHaveBeenCalled();
	});

	it("sin id o con un rol que no existe no guarda nada", async () => {
		adminHolder.current = makeAdminMock({ tables: { role_definitions: [{ data: null, error: null }] } });
		expect((await patch({ navTabs: [] })).status).toBe(400);
		expect((await patch({ id: "no-existe", navTabs: [] })).status).toBe(404);
		expect(logAdminAudit).not.toHaveBeenCalled();
	});
});

describe("GET /api/super-admin/roles", () => {
	it("devuelve los permisos y marca los roles de acceso total", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				role_definitions: [
					{
						data: [
							{ id: "1", name: "ceo", description: null, is_system: true, nav_tabs: null, actions: [] },
							{ id: "2", name: "cashier", description: "Cajero", is_system: true, nav_tabs: ["orders"], actions: ["orders.refund"] },
						],
						error: null,
					},
				],
			},
		});
		const body = (await (await GET()).json()) as { roles: Array<Record<string, unknown>> };
		expect(body.roles[0]).toMatchObject({ name: "ceo", fullAccess: true, permissionsReady: true });
		expect(body.roles[1]).toMatchObject({ name: "cashier", fullAccess: false, navTabs: ["orders"], actions: ["orders.refund"] });
	});

	it("sin las columnas nuevas en la base, avisa que faltan", async () => {
		adminHolder.current = makeAdminMock({
			tables: { role_definitions: [{ data: [{ id: "2", name: "cashier", description: null, is_system: true }], error: null }] },
		});
		const body = (await (await GET()).json()) as { roles: Array<Record<string, unknown>> };
		expect(body.roles[0]).toMatchObject({ permissionsReady: false, navTabs: null, actions: [] });
	});
});
