import { NextRequest, NextResponse } from "next/server";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const TENANT_MANAGEABLE_ROLES = new Set(["admin", "ceo", "cashier"]);
const RESERVED_NON_TENANT_ROLES = new Set(["super_admin", "owner"]);

const normalizeTenantRole = (value: unknown) => String(value ?? "").trim().toLowerCase();

async function isAllowedTenantRole(role: string) {
	const normalizedRole = normalizeTenantRole(role);
	if (!normalizedRole || RESERVED_NON_TENANT_ROLES.has(normalizedRole)) {
		return false;
	}

	const { data, error } = await supabaseAdmin
		.from("role_definitions")
		.select("name")
		.eq("name", normalizedRole)
		.maybeSingle();

	if (error) {
		return TENANT_MANAGEABLE_ROLES.has(normalizedRole);
	}

	return Boolean(data?.name);
}

async function validateSuperAdminAccess() {
	const result = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!result.ok) {
		return {
			ok: false as const,
			response: NextResponse.json(
				{ error: result.error ?? "No autorizado" },
				{ status: result.status }
			),
		};
	}
	return { ok: true as const };
}

export async function GET(req: NextRequest) {
	const access = await validateSuperAdminAccess();
	if (!access.ok) {
		return access.response;
	}

	const url = new URL(req.url);
	const companyId = url.searchParams.get("companyId");
	
	if (!companyId) {
		return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("users")
		.select("id,email,role,branch_id,branch:branches!users_branch_id_fkey(name)")
		.eq("company_id", companyId);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ users: data });
}

export async function POST(req: NextRequest) {
	const access = await validateSuperAdminAccess();
	if (!access.ok) {
		return access.response;
	}

	const { email, password, role, company_id, branch_id } = await req.json();
	if (!email || !password || !role || !company_id) {
		return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
	}

	const normalizedRole = normalizeTenantRole(role);
	if (!(await isAllowedTenantRole(normalizedRole))) {
		return NextResponse.json({ error: "Rol no permitido para gestion de tenants" }, { status: 400 });
	}

	const normalizedBranchId =
		typeof branch_id === "string" && branch_id.trim().length > 0
			? branch_id.trim()
			: null;

	if (normalizedBranchId) {
		const { data: branch, error: branchError } = await supabaseAdmin
			.from("branches")
			.select("id,company_id")
			.eq("id", normalizedBranchId)
			.maybeSingle();

		if (branchError) {
			return NextResponse.json({ error: branchError.message }, { status: 400 });
		}

		if (!branch || branch.company_id !== company_id) {
			return NextResponse.json({ error: "La sucursal no pertenece a la empresa" }, { status: 400 });
		}
	}

	const normalizedEmail = String(email).trim().toLowerCase();

	// Crear usuario en Auth
	const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
		email: normalizedEmail,
		password,
		email_confirm: true,
	});

	if (authError) {
		return NextResponse.json({ error: authError.message }, { status: 400 });
	}

	// Guardar en tabla users scoped por company
	const { error } = await supabaseAdmin.from("users").insert({
		email: normalizedEmail,
		role: normalizedRole,
		company_id,
		branch_id: normalizedBranchId,
		auth_user_id: authUser.user?.id,
		auth_id: authUser.user?.id,
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
	const access = await validateSuperAdminAccess();
	if (!access.ok) {
		return access.response;
	}

	const { id } = await req.json();
	if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
	// Buscar auth_id
	const { data: userRow, error: userError } = await supabaseAdmin
		.from("users")
		.select("auth_id,email,company_id")
		.eq("id", id)
		.maybeSingle();
	if (userError) return NextResponse.json({ error: userError.message }, { status: 400 });

	if (userRow?.auth_id) {
		const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userRow.auth_id);
		if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
	}
	const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
	const access = await validateSuperAdminAccess();
	if (!access.ok) {
		return access.response;
	}

	const { id, email, role, password, branch_id } = await req.json();
	if (!id || !email || !role) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
	
	const normalizedEmail = String(email).trim().toLowerCase();
	const normalizedRole = normalizeTenantRole(role);
	if (!(await isAllowedTenantRole(normalizedRole))) {
		return NextResponse.json({ error: "Rol no permitido para gestion de tenants" }, { status: 400 });
	}

	const normalizedBranchId =
		typeof branch_id === "string" && branch_id.trim().length > 0
			? branch_id.trim()
			: null;

	if (normalizedBranchId) {
		const { data: userCompany, error: userCompanyError } = await supabaseAdmin
			.from("users")
			.select("company_id")
			.eq("id", id)
			.maybeSingle();

		if (userCompanyError || !userCompany?.company_id) {
			return NextResponse.json({ error: "No se pudo validar la empresa del usuario" }, { status: 400 });
		}

		const { data: branch, error: branchError } = await supabaseAdmin
			.from("branches")
			.select("id,company_id")
			.eq("id", normalizedBranchId)
			.maybeSingle();

		if (branchError) {
			return NextResponse.json({ error: branchError.message }, { status: 400 });
		}

		if (!branch || branch.company_id !== userCompany.company_id) {
			return NextResponse.json({ error: "La sucursal no pertenece a la empresa" }, { status: 400 });
		}
	}
	// Buscar auth_id
	const { data: userRow, error: userError } = await supabaseAdmin
		.from("users")
		.select("auth_id,company_id,email")
		.eq("id", id)
		.maybeSingle();
	if (userError) return NextResponse.json({ error: userError.message }, { status: 400 });
	if (userRow?.auth_id) {
		if (password) {
			const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(
				userRow.auth_id,
				{ password }
			);
			if (passError) return NextResponse.json({ error: passError.message }, { status: 400 });
		}
		if (email) {
			const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
				userRow.auth_id,
				{ email: normalizedEmail }
			);
			if (emailError) return NextResponse.json({ error: emailError.message }, { status: 400 });
		}
	}
	const { error } = await supabaseAdmin
		.from("users")
		.update({ email: normalizedEmail, role: normalizedRole, branch_id: normalizedBranchId })
		.eq("id", id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	return NextResponse.json({ success: true });
}
