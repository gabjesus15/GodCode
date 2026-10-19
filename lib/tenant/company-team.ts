import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { ROLE_TAB_OPTIONS, sanitizeRoleActions, sanitizeRoleNavTabs } from "@/lib/super-admin/role-permissions";
import { uniqueTabs } from "@/lib/super-admin/tenant-admin-tabs";

/**
 * Equipo del negocio desde /cuenta › Equipo (sql/2026-10-17_company_roles.sql).
 *
 * - El CEO crea usuarios hasta `plans.max_users`. Los CEO no cuentan en ese tope.
 * - Cada usuario es administrador (todo), cajero (lo que el super admin le da al cajero)
 *   o tiene un rol propio del negocio. En la base, el rol propio queda como cajero +
 *   `company_role_id`: su sucursal y todo lo que limita al cajero sigue igual, y el rol
 *   propio decide qué pestañas ve y qué acciones puede hacer.
 * - Un usuario desactivado no cuenta en el tope y no puede entrar (se bloquea en Auth).
 * - La empresa sale siempre de la sesión del CEO, nunca del cuerpo.
 */

export type TeamFailure = { ok: false; status: number; error: string };
export type TeamResult<T extends object = object> = ({ ok: true } & T) | TeamFailure;

export type TeamMember = {
	id: string;
	email: string;
	fullName: string | null;
	role: "admin" | "cashier";
	companyRoleId: string | null;
	branchId: string | null;
	isActive: boolean;
};

export type CompanyRole = {
	id: string;
	name: string;
	navTabs: string[];
	actions: string[];
	members: number;
};

export type TeamSnapshot = {
	members: TeamMember[];
	roles: CompanyRole[];
	branches: Array<{ id: string; name: string }>;
	seats: { used: number; limit: number | null };
	/** Pestañas que se le pueden dar a un rol propio: las del panel que trae el plan. */
	availableTabs: string[];
};

/** Los planes internos usan 9999 como «sin tope». */
const UNLIMITED_FROM = 9999;
const MIN_PASSWORD_LENGTH = 8;
const MAX_ROLE_NAME_LENGTH = 40;
/** Largo de sobra para que un bloqueo en Auth no venza (≈ 100 años). */
const DEACTIVATED_BAN = "876000h";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_ROLE_NAMES = new Set(["admin", "administrador", "ceo", "cajero", "cashier", "staff", "super_admin"]);

const fail = (status: number, error: string): TeamFailure => ({ ok: false, status, error });
const isCeoRole = (role: unknown) => String(role ?? "").trim().toLowerCase() === "ceo";
const cleanId = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Tope de usuarios del equipo; `null` = sin tope. */
export function teamSeatLimit(maxUsers: unknown): number | null {
	if (maxUsers == null || maxUsers === "") return null;
	const n = Math.floor(Number(maxUsers));
	if (!Number.isFinite(n) || n >= UNLIMITED_FROM) return null;
	return Math.max(0, n);
}

/** Pestañas del panel que trae el plan del negocio; `null` = todas (sin `panelAccess` guardado). */
function panelTabsOf(themeConfig: unknown): Set<string> | null {
	const raw = themeConfig && typeof themeConfig === "object" ? (themeConfig as Record<string, unknown>).panelAccess : undefined;
	if (!Array.isArray(raw)) return null;
	return new Set(uniqueTabs(raw.filter((value): value is string => typeof value === "string")));
}

async function loadCompanyPlan(companyId: string): Promise<{ limit: number | null; panelTabs: Set<string> | null }> {
	const { data, error } = await supabaseAdmin
		.from("companies")
		.select("theme_config, plan:plans(max_users)")
		.eq("id", companyId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	const row = data as { theme_config?: unknown; plan?: unknown } | null;
	const plan = (Array.isArray(row?.plan) ? row?.plan[0] : row?.plan) as { max_users?: unknown } | null | undefined;
	return { limit: teamSeatLimit(plan?.max_users), panelTabs: panelTabsOf(row?.theme_config) };
}

/** Usuarios activos del negocio que ocupan cupo (todos menos los CEO). */
export async function countUsedSeats(companyId: string): Promise<number> {
	const { count, error } = await supabaseAdmin
		.from("users")
		.select("id", { count: "exact", head: true })
		.eq("company_id", companyId)
		.not("is_active", "is", false)
		.neq("role", "ceo");
	if (error) throw new Error(error.message);
	return Number(count ?? 0);
}

async function assertSeatAvailable(companyId: string): Promise<TeamFailure | null> {
	const [{ limit }, used] = await Promise.all([loadCompanyPlan(companyId), countUsedSeats(companyId)]);
	if (limit == null || used < limit) return null;
	return fail(
		409,
		limit === 0
			? "Tu plan no incluye usuarios para tu equipo. Mira los planes en «Plan y extras»."
			: `Tu plan permite ${limit} ${limit === 1 ? "usuario" : "usuarios"} en tu equipo y ya los tienes. Desactiva uno o cambia de plan.`,
	);
}

export async function loadTeam(companyId: string): Promise<TeamSnapshot> {
	const [plan, usersRes, rolesRes, branchesRes] = await Promise.all([
		loadCompanyPlan(companyId),
		supabaseAdmin
			.from("users")
			.select("id,email,full_name,role,branch_id,is_active,company_role_id")
			.eq("company_id", companyId)
			.order("email", { ascending: true }),
		supabaseAdmin
			.from("company_roles")
			.select("id,name,nav_tabs,actions")
			.eq("company_id", companyId)
			.order("name", { ascending: true }),
		supabaseAdmin.from("branches").select("id,name").eq("company_id", companyId).order("name", { ascending: true }),
	]);
	for (const res of [usersRes, rolesRes, branchesRes]) {
		if (res.error) throw new Error(res.error.message);
	}

	type UserRow = {
		id: string;
		email: string | null;
		full_name: string | null;
		role: string | null;
		branch_id: string | null;
		is_active: boolean | null;
		company_role_id: string | null;
	};
	const members: TeamMember[] = ((usersRes.data ?? []) as UserRow[])
		.filter((row) => !isCeoRole(row.role))
		.map((row) => ({
			id: row.id,
			email: row.email ?? "",
			fullName: row.full_name,
			role: String(row.role ?? "").trim().toLowerCase() === "admin" ? "admin" : "cashier",
			companyRoleId: row.company_role_id,
			branchId: row.branch_id,
			isActive: row.is_active !== false,
		}));

	type RoleRow = { id: string; name: string; nav_tabs: string[] | null; actions: string[] | null };
	const roles: CompanyRole[] = ((rolesRes.data ?? []) as RoleRow[]).map((row) => ({
		id: row.id,
		name: row.name,
		navTabs: row.nav_tabs ?? [],
		actions: row.actions ?? [],
		members: members.filter((m) => m.companyRoleId === row.id).length,
	}));

	return {
		members,
		roles,
		branches: ((branchesRes.data ?? []) as Array<{ id: string; name: string | null }>).map((b) => ({
			id: b.id,
			name: b.name ?? "Sucursal",
		})),
		seats: { used: members.filter((m) => m.isActive).length, limit: plan.limit },
		availableTabs: ROLE_TAB_OPTIONS.map((tab) => tab.id).filter((id) => !plan.panelTabs || plan.panelTabs.has(id)),
	};
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

type RoleChoice = { role: "admin" | "cashier"; companyRoleId: string | null };

/** admin, cajero o un rol propio del negocio (que queda como cajero + `company_role_id`). Nunca CEO. */
async function resolveRoleChoice(companyId: string, body: Record<string, unknown>): Promise<TeamResult<RoleChoice>> {
	const companyRoleId = cleanId(body.companyRoleId);
	if (companyRoleId) {
		const { data, error } = await supabaseAdmin
			.from("company_roles")
			.select("id")
			.eq("id", companyRoleId)
			.eq("company_id", companyId)
			.maybeSingle();
		if (error) return fail(500, error.message);
		if (!data) return fail(400, "Ese rol no es de tu negocio");
		return { ok: true, role: "cashier", companyRoleId };
	}
	const role = String(body.role ?? "").trim().toLowerCase();
	if (role === "admin" || role === "cashier") return { ok: true, role, companyRoleId: null };
	return fail(400, "Elige un rol: administrador, cajero o uno de los tuyos");
}

async function resolveBranch(companyId: string, raw: unknown): Promise<TeamResult<{ branchId: string | null }>> {
	const branchId = cleanId(raw);
	if (!branchId) return { ok: true, branchId: null };
	const { data, error } = await supabaseAdmin
		.from("branches")
		.select("id")
		.eq("id", branchId)
		.eq("company_id", companyId)
		.maybeSingle();
	if (error) return fail(500, error.message);
	if (!data) return fail(400, "Esa sucursal no es de tu negocio");
	return { ok: true, branchId };
}

function checkPassword(password: string): TeamFailure | null {
	return password.length < MIN_PASSWORD_LENGTH
		? fail(400, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
		: null;
}

export async function createTeamMember(
	ctx: { companyId: string; userId: string },
	body: Record<string, unknown>,
): Promise<TeamResult> {
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";
	const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 80) : "";
	if (!EMAIL_RE.test(email)) return fail(400, "El correo no es válido");
	const weak = checkPassword(password);
	if (weak) return weak;

	const role = await resolveRoleChoice(ctx.companyId, body);
	if (!role.ok) return role;
	const branch = await resolveBranch(ctx.companyId, body.branchId);
	if (!branch.ok) return branch;

	const full = await assertSeatAvailable(ctx.companyId);
	if (full) return full;

	const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
	});
	if (authError || !authUser?.user?.id) {
		const message = authError?.message ?? "No se pudo crear el acceso";
		return /already|registered|exists/i.test(message)
			? fail(409, "Ese correo ya tiene una cuenta en GodCode")
			: fail(400, message);
	}

	const { error } = await supabaseAdmin.from("users").insert({
		email,
		full_name: fullName || null,
		role: role.role,
		company_role_id: role.companyRoleId,
		company_id: ctx.companyId,
		branch_id: branch.branchId,
		auth_user_id: authUser.user.id,
		auth_id: authUser.user.id,
		created_by: ctx.userId,
		is_active: true,
	});
	if (error) {
		// Sin fila en users el acceso no sirve para nada: no se deja colgando.
		await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
		return fail(400, error.message);
	}
	return { ok: true };
}

type MemberRow = { id: string; auth_id: string | null; company_id: string | null; role: string | null; is_active: boolean | null };

/** El usuario, si es del negocio y no es CEO. */
async function loadEditableMember(companyId: string, id: string | null): Promise<TeamResult<{ row: MemberRow }>> {
	if (!id) return fail(400, "Falta el usuario");
	const { data, error } = await supabaseAdmin
		.from("users")
		.select("id,auth_id,company_id,role,is_active")
		.eq("id", id)
		.maybeSingle();
	if (error) return fail(500, error.message);
	const row = data as MemberRow | null;
	if (!row || row.company_id !== companyId) return fail(404, "Usuario no encontrado");
	if (isCeoRole(row.role)) return fail(403, "Las cuentas de CEO no se cambian desde aquí");
	return { ok: true, row };
}

export async function updateTeamMember(companyId: string, body: Record<string, unknown>): Promise<TeamResult> {
	const member = await loadEditableMember(companyId, cleanId(body.id));
	if (!member.ok) return member;
	const { row } = member;

	const patch: Record<string, unknown> = {};
	if (body.role !== undefined || body.companyRoleId !== undefined) {
		const role = await resolveRoleChoice(companyId, body);
		if (!role.ok) return role;
		patch.role = role.role;
		patch.company_role_id = role.companyRoleId;
	}
	if (body.branchId !== undefined) {
		const branch = await resolveBranch(companyId, body.branchId);
		if (!branch.ok) return branch;
		patch.branch_id = branch.branchId;
	}
	if (typeof body.fullName === "string") patch.full_name = body.fullName.trim().slice(0, 80) || null;

	const password = typeof body.password === "string" && body.password.length > 0 ? body.password : null;
	if (password) {
		const weak = checkPassword(password);
		if (weak) return weak;
	}

	let ban: string | null = null;
	if (typeof body.isActive === "boolean" && body.isActive !== (row.is_active !== false)) {
		if (body.isActive) {
			const full = await assertSeatAvailable(companyId);
			if (full) return full;
		}
		patch.is_active = body.isActive;
		ban = body.isActive ? "none" : DEACTIVATED_BAN;
	}

	if (row.auth_id && (password || ban)) {
		const { error } = await supabaseAdmin.auth.admin.updateUserById(row.auth_id, {
			...(password ? { password } : {}),
			...(ban ? { ban_duration: ban } : {}),
		});
		if (error) return fail(400, error.message);
	}

	if (Object.keys(patch).length > 0) {
		const { error } = await supabaseAdmin.from("users").update(patch).eq("id", row.id).eq("company_id", companyId);
		if (error) return fail(400, error.message);
	}
	return { ok: true };
}

export async function deleteTeamMember(companyId: string, body: Record<string, unknown>): Promise<TeamResult> {
	const member = await loadEditableMember(companyId, cleanId(body.id));
	if (!member.ok) return member;
	const { row } = member;

	// Primero la fila: si algo del negocio la usa, no se borra nada y se puede desactivar.
	const { error } = await supabaseAdmin.from("users").delete().eq("id", row.id).eq("company_id", companyId);
	if (error) {
		return error.code === "23503"
			? fail(409, "Este usuario ya tiene movimientos en el negocio: desactívalo en vez de borrarlo")
			: fail(400, error.message);
	}
	if (row.auth_id) {
		const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(row.auth_id);
		if (authError) return fail(400, authError.message);
	}
	return { ok: true };
}

// ---------------------------------------------------------------------------
// Roles propios
// ---------------------------------------------------------------------------

type RoleFields = { name: string; nav_tabs: string[]; actions: string[] };

async function sanitizeRoleFields(companyId: string, body: Record<string, unknown>): Promise<TeamResult<{ fields: RoleFields }>> {
	const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
	if (!name) return fail(400, "Ponle un nombre al rol");
	if (name.length > MAX_ROLE_NAME_LENGTH) return fail(400, `El nombre puede tener hasta ${MAX_ROLE_NAME_LENGTH} caracteres`);
	if (RESERVED_ROLE_NAMES.has(name.toLowerCase())) return fail(400, "Ese nombre ya lo usa un rol de GodCode: elige otro");

	const { panelTabs } = await loadCompanyPlan(companyId);
	const navTabs = sanitizeRoleNavTabs(body.navTabs).filter((id) => !panelTabs || panelTabs.has(id));
	if (navTabs.length === 0) return fail(400, "Elige al menos una sección del panel");

	return { ok: true, fields: { name, nav_tabs: navTabs, actions: sanitizeRoleActions(body.actions) } };
}

const DUPLICATE_ROLE = "Ya tienes un rol con ese nombre";

export async function createCompanyRole(companyId: string, body: Record<string, unknown>): Promise<TeamResult> {
	const clean = await sanitizeRoleFields(companyId, body);
	if (!clean.ok) return clean;
	const { error } = await supabaseAdmin.from("company_roles").insert({ company_id: companyId, ...clean.fields });
	if (error) return error.code === "23505" ? fail(409, DUPLICATE_ROLE) : fail(400, error.message);
	return { ok: true };
}

export async function updateCompanyRole(companyId: string, body: Record<string, unknown>): Promise<TeamResult> {
	const id = cleanId(body.id);
	if (!id) return fail(400, "Falta el rol");
	const clean = await sanitizeRoleFields(companyId, body);
	if (!clean.ok) return clean;
	const { data, error } = await supabaseAdmin
		.from("company_roles")
		.update(clean.fields)
		.eq("id", id)
		.eq("company_id", companyId)
		.select("id")
		.maybeSingle();
	if (error) return error.code === "23505" ? fail(409, DUPLICATE_ROLE) : fail(400, error.message);
	if (!data) return fail(404, "Rol no encontrado");
	return { ok: true };
}

export async function deleteCompanyRole(companyId: string, body: Record<string, unknown>): Promise<TeamResult> {
	const id = cleanId(body.id);
	if (!id) return fail(400, "Falta el rol");
	const { count, error: countError } = await supabaseAdmin
		.from("users")
		.select("id", { count: "exact", head: true })
		.eq("company_id", companyId)
		.eq("company_role_id", id);
	if (countError) return fail(500, countError.message);
	const inUse = Number(count ?? 0);
	if (inUse > 0) {
		return fail(409, `Lo ${inUse === 1 ? "usa 1 usuario" : `usan ${inUse} usuarios`}: cámbiales el rol antes de borrarlo`);
	}
	const { data, error } = await supabaseAdmin
		.from("company_roles")
		.delete()
		.eq("id", id)
		.eq("company_id", companyId)
		.select("id")
		.maybeSingle();
	if (error) return fail(400, error.message);
	if (!data) return fail(404, "Rol no encontrado");
	return { ok: true };
}
