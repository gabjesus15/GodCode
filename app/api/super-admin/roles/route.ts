import { NextRequest, NextResponse } from "next/server";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateSuperAdminAccess } from "@/utils/admin/server-auth";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { isFullAccessRole, sanitizeRoleActions, sanitizeRoleNavTabs } from "@/lib/super-admin/role-permissions";

/** @service-role super-admin */

type RoleRow = {
	id: string;
	name: string;
	description: string | null;
	is_system: boolean;
	/** Columnas de sql/2026-10-16_role_permissions.sql; faltan si la base aún no lo tiene. */
	nav_tabs?: string[] | null;
	actions?: string[] | null;
};

export async function GET() {
	const access = await validateSuperAdminAccess(SAAS_READ_ROLES);
	if (!access.ok) return access.response;

	// `*` y no la lista de columnas: así la pantalla sigue cargando aunque la base aún no
	// tenga nav_tabs/actions.
	const { data, error } = await supabaseAdmin
		.from("role_definitions")
		.select("*")
		.order("is_system", { ascending: false })
		.order("name", { ascending: true });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const roles = ((data ?? []) as RoleRow[]).map((role) => ({
		id: role.id,
		name: role.name,
		description: role.description ?? "",
		isSystem: role.is_system,
		fullAccess: isFullAccessRole(role.name),
		permissionsReady: "actions" in role,
		navTabs: Array.isArray(role.nav_tabs) ? role.nav_tabs : null,
		actions: Array.isArray(role.actions) ? role.actions : [],
	}));

	return NextResponse.json({ roles });
}

/** Pestañas y acciones de un rol. admin/ceo/super_admin no se tocan: ven y hacen todo. */
export async function PATCH(req: NextRequest) {
	const access = await validateSuperAdminAccess(SAAS_MUTATE_ROLES);
	if (!access.ok) return access.response;

	const body = (await req.json().catch(() => null)) as { id?: unknown; navTabs?: unknown; actions?: unknown } | null;
	const id = typeof body?.id === "string" ? body.id.trim() : "";
	if (!id) {
		return NextResponse.json({ error: "Falta el id del rol" }, { status: 400 });
	}

	const { data: role, error: roleError } = await supabaseAdmin
		.from("role_definitions")
		.select("id,name")
		.eq("id", id)
		.maybeSingle();
	if (roleError) {
		return NextResponse.json({ error: roleError.message }, { status: 400 });
	}
	if (!role) {
		return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
	}
	if (isFullAccessRole(role.name)) {
		return NextResponse.json({ error: "Este rol ve y hace todo; sus permisos no se editan" }, { status: 400 });
	}

	const navTabs = sanitizeRoleNavTabs(body?.navTabs);
	const actions = sanitizeRoleActions(body?.actions);

	const { error } = await supabaseAdmin
		.from("role_definitions")
		.update({ nav_tabs: navTabs, actions })
		.eq("id", id);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	await logAdminAudit({
		actorEmail: access.email ?? "",
		action: "role.permissions.update",
		resourceType: "role",
		resourceId: id,
		metadata: { role: role.name, nav_tabs: navTabs, actions },
	});

	return NextResponse.json({ success: true, role: { id, name: role.name, navTabs, actions } });
}

export async function POST(req: NextRequest) {
	const access = await validateSuperAdminAccess(SAAS_MUTATE_ROLES);
	if (!access.ok) return access.response;

	const { name, description } = await req.json();
	if (!name) {
		return NextResponse.json({ error: "El nombre del rol es requerido" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin.rpc("create_role_definition", {
		p_name: String(name),
		p_description: description ? String(description) : null,
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const role = Array.isArray(data) ? data[0] : data;
	return NextResponse.json({
		success: true,
		role: role
			? {
					id: role.id,
					name: role.name,
					description: role.description ?? "",
					isSystem: role.is_system,
			  }
			: null,
	});
}

export async function PUT(req: NextRequest) {
	const access = await validateSuperAdminAccess(SAAS_MUTATE_ROLES);
	if (!access.ok) return access.response;

	const { id, name, description } = await req.json();
	if (!id || !name) {
		return NextResponse.json({ error: "Faltan datos para actualizar el rol" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin.rpc("update_role_definition", {
		p_role_id: id,
		p_name: String(name),
		p_description: description ? String(description) : null,
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const role = Array.isArray(data) ? data[0] : data;
	return NextResponse.json({
		success: true,
		role: role
			? {
					id: role.id,
					name: role.name,
					description: role.description ?? "",
					isSystem: role.is_system,
			  }
			: null,
	});
}

export async function DELETE(req: NextRequest) {
	const access = await validateSuperAdminAccess(SAAS_MUTATE_ROLES);
	if (!access.ok) return access.response;

	const { id } = await req.json();
	if (!id) {
		return NextResponse.json({ error: "Falta el id del rol" }, { status: 400 });
	}

	const { error } = await supabaseAdmin.rpc("delete_role_definition", {
		p_role_id: id,
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
}
