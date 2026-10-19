import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const adminHolder = { current: makeAdminMock({ tables: {} }) };
vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

const holder = { ctx: null as { companyId: string; userId: string; email: string; role: string } | null };
vi.mock("@/lib/tenant/customer-account-context", () => ({
	getCustomerAccountContext: vi.fn(async () => holder.ctx),
}));
vi.mock("@/lib/tenant/customer-account-rate-limit", () => ({
	assertCustomerAccountRateLimit: vi.fn(async () => null as NextResponse | null),
}));

import { GET as getTeam } from "@/app/api/customer-account/team/route";
import {
	createCompanyRole,
	createTeamMember,
	deleteCompanyRole,
	teamSeatLimit,
	updateTeamMember,
} from "@/lib/tenant/company-team";

const CEO = { companyId: "acme", userId: "u-ceo" };
const plan = (maxUsers: number | null, panelAccess?: string[]) => ({
	data: { theme_config: panelAccess ? { panelAccess } : {}, plan: { max_users: maxUsers } },
	error: null,
});

function authAdmin() {
	return {
		createUser: vi.fn(async () => ({ data: { user: { id: "auth-new" } }, error: null })),
		updateUserById: vi.fn(async () => ({ data: {}, error: null })),
		deleteUser: vi.fn(async () => ({ data: {}, error: null })),
	};
}

/** Lo que se le pasó a `insert`/`update` en la tabla, en orden. */
function writes(table: string, method: "insert" | "update") {
	return adminHolder.current.chains
		.filter((c) => c.table === table)
		.flatMap((c) => (c.chain[method] as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0]));
}

beforeEach(() => {
	holder.ctx = { ...CEO, email: "ceo@acme.cl", role: "ceo" };
});

describe("tope de usuarios del equipo", () => {
	it("sin dato o con el 9999 de los planes internos no hay tope", () => {
		expect(teamSeatLimit(null)).toBeNull();
		expect(teamSeatLimit(9999)).toBeNull();
		expect(teamSeatLimit(4)).toBe(4);
		expect(teamSeatLimit("7")).toBe(7);
		expect(teamSeatLimit(-1)).toBe(0);
	});

	it("con el cupo lleno no crea el acceso, y el conteo deja fuera a los CEO", async () => {
		const auth = authAdmin();
		adminHolder.current = makeAdminMock({
			tables: { companies: [plan(4)], users: [{ count: 4, data: null, error: null }] },
			authAdmin: auth,
		});
		const res = await createTeamMember(CEO, { email: "mesero@acme.cl", password: "12345678", role: "cashier" });
		expect(res).toMatchObject({ ok: false, status: 409 });
		expect(auth.createUser).not.toHaveBeenCalled();
		const countChain = adminHolder.current.chains.find((c) => c.table === "users")!.chain;
		expect(countChain.neq).toHaveBeenCalledWith("role", "ceo");
		expect(countChain.not).toHaveBeenCalledWith("is_active", "is", false);
	});

	it("reactivar a alguien con el cupo lleno no se deja", async () => {
		const auth = authAdmin();
		adminHolder.current = makeAdminMock({
			tables: {
				users: [
					{ data: { id: "u1", auth_id: "a1", company_id: "acme", role: "cashier", is_active: false }, error: null },
					{ count: 4, data: null, error: null },
				],
				companies: [plan(4)],
			},
			authAdmin: auth,
		});
		expect(await updateTeamMember("acme", { id: "u1", isActive: true })).toMatchObject({ ok: false, status: 409 });
		expect(auth.updateUserById).not.toHaveBeenCalled();
		expect(writes("users", "update")).toEqual([]);
	});

	it("desactivar libera el cupo y bloquea la entrada", async () => {
		const auth = authAdmin();
		adminHolder.current = makeAdminMock({
			tables: { users: [{ data: { id: "u1", auth_id: "a1", company_id: "acme", role: "cashier", is_active: true }, error: null }] },
			authAdmin: auth,
		});
		expect(await updateTeamMember("acme", { id: "u1", isActive: false })).toEqual({ ok: true });
		expect(auth.updateUserById).toHaveBeenCalledWith("a1", { ban_duration: "876000h" });
		expect(writes("users", "update")).toEqual([{ is_active: false }]);
	});
});

describe("usuarios del equipo", () => {
	it("crea un usuario con rol propio: queda como cajero con su rol del negocio", async () => {
		const auth = authAdmin();
		adminHolder.current = makeAdminMock({
			tables: {
				company_roles: [{ data: { id: "r-mesero" }, error: null }],
				branches: [{ data: { id: "b1" }, error: null }],
				companies: [plan(4)],
				users: [{ count: 3, data: null, error: null }, { data: null, error: null }],
			},
			authAdmin: auth,
		});
		const res = await createTeamMember(CEO, {
			email: " Mesero@Acme.cl ",
			password: "12345678",
			companyRoleId: "r-mesero",
			branchId: "b1",
			company_id: "otra-empresa",
		});
		expect(res).toEqual({ ok: true });
		expect(auth.createUser).toHaveBeenCalledWith({ email: "mesero@acme.cl", password: "12345678", email_confirm: true });
		expect(writes("users", "insert")).toEqual([
			expect.objectContaining({
				email: "mesero@acme.cl",
				role: "cashier",
				company_role_id: "r-mesero",
				company_id: "acme",
				branch_id: "b1",
				auth_user_id: "auth-new",
				created_by: "u-ceo",
			}),
		]);
	});

	it("no deja crear un CEO ni usar un rol de otro negocio", async () => {
		const auth = authAdmin();
		adminHolder.current = makeAdminMock({ tables: { company_roles: [{ data: null, error: null }] }, authAdmin: auth });
		expect(await createTeamMember(CEO, { email: "x@acme.cl", password: "12345678", role: "ceo" })).toMatchObject({ status: 400 });
		expect(await createTeamMember(CEO, { email: "x@acme.cl", password: "12345678", companyRoleId: "ajeno" })).toMatchObject({
			status: 400,
			error: "Ese rol no es de tu negocio",
		});
		expect(auth.createUser).not.toHaveBeenCalled();
	});

	it("si la fila no se guarda, se borra el acceso recién creado", async () => {
		const auth = authAdmin();
		adminHolder.current = makeAdminMock({
			tables: { companies: [plan(null)], users: [{ count: 0, data: null, error: null }, { data: null, error: { message: "boom" } }] },
			authAdmin: auth,
		});
		expect(await createTeamMember(CEO, { email: "x@acme.cl", password: "12345678", role: "admin" })).toMatchObject({ status: 400 });
		expect(auth.deleteUser).toHaveBeenCalledWith("auth-new");
	});

	it("no toca usuarios de otro negocio ni cuentas de CEO", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				users: [
					{ data: { id: "u9", auth_id: "a9", company_id: "otra", role: "cashier", is_active: true }, error: null },
					{ data: { id: "u2", auth_id: "a2", company_id: "acme", role: "ceo", is_active: true }, error: null },
				],
			},
			authAdmin: authAdmin(),
		});
		expect(await updateTeamMember("acme", { id: "u9", role: "admin" })).toMatchObject({ status: 404 });
		expect(await updateTeamMember("acme", { id: "u2", role: "cashier" })).toMatchObject({ status: 403 });
		expect(writes("users", "update")).toEqual([]);
	});
});

describe("roles propios", () => {
	it("deja solo secciones del plan y acciones conocidas", async () => {
		adminHolder.current = makeAdminMock({
			tables: { companies: [plan(4, ["orders", "caja"])], company_roles: [{ data: null, error: null }] },
		});
		const res = await createCompanyRole("acme", {
			name: "  Mesero   de  salón ",
			navTabs: ["orders", "coupons", "inventado"],
			actions: ["orders.refund", "hackear"],
			company_id: "otra",
		});
		expect(res).toEqual({ ok: true });
		expect(writes("company_roles", "insert")).toEqual([
			{ company_id: "acme", name: "Mesero de salón", nav_tabs: ["orders"], actions: ["orders.refund"] },
		]);
	});

	it("pide al menos una sección y un nombre que no sea de GodCode", async () => {
		adminHolder.current = makeAdminMock({ tables: { companies: [plan(4, ["orders"])] } });
		expect(await createCompanyRole("acme", { name: "Mesero", navTabs: ["coupons"] })).toMatchObject({ status: 400 });
		expect(await createCompanyRole("acme", { name: "Cajero", navTabs: ["orders"] })).toMatchObject({ status: 400 });
	});

	it("no se borra un rol que alguien usa", async () => {
		adminHolder.current = makeAdminMock({ tables: { users: [{ count: 2, data: null, error: null }] } });
		const res = await deleteCompanyRole("acme", { id: "r-mesero" });
		expect(res).toMatchObject({ ok: false, status: 409 });
		expect(adminHolder.current.fromCalls).not.toContain("company_roles");
	});
});

describe("GET /api/customer-account/team", () => {
	it("sin sesión de CEO no devuelve nada", async () => {
		holder.ctx = null;
		expect((await getTeam()).status).toBe(401);
		holder.ctx = { ...CEO, email: "admin@acme.cl", role: "admin" };
		expect((await getTeam()).status).toBe(403);
	});

	it("devuelve el equipo sin el CEO, el cupo usado y las secciones del plan", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				companies: [plan(4, ["orders", "caja", "coupons"])],
				users: [
					{
						data: [
							{ id: "u1", email: "ceo@acme.cl", role: "ceo", is_active: true, company_role_id: null, branch_id: null, full_name: null },
							{ id: "u2", email: "a@acme.cl", role: "cashier", is_active: true, company_role_id: "r1", branch_id: "b1", full_name: "Ana" },
							{ id: "u3", email: "b@acme.cl", role: "staff", is_active: false, company_role_id: null, branch_id: null, full_name: null },
						],
						error: null,
					},
				],
				company_roles: [{ data: [{ id: "r1", name: "Mesero", nav_tabs: ["orders"], actions: [] }], error: null }],
				branches: [{ data: [{ id: "b1", name: "Centro" }], error: null }],
			},
		});
		const body = await (await getTeam()).json();
		expect(body.members.map((m: { email: string }) => m.email)).toEqual(["a@acme.cl", "b@acme.cl"]);
		expect(body.members[1]).toMatchObject({ role: "cashier", isActive: false });
		expect(body.seats).toEqual({ used: 1, limit: 4 });
		expect(body.roles).toEqual([{ id: "r1", name: "Mesero", navTabs: ["orders"], actions: [], members: 1 }]);
		expect(body.availableTabs).toEqual(["orders", "caja", "coupons"]);
	});
});
