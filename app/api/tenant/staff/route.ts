import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { withApiHandler } from "@/lib/api/api-handler";
import { TenantStaffService } from "@/lib/services/tenant-staff.service";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/api/errors";

const TENANT_ALLOWED_ROLES = new Set(["ceo", "cashier"]);

export const GET = withApiHandler(async (_req) => {
	const ceo = await TenantStaffService.getCeoSession();

	const { data, error } = await supabaseAdmin
		.from("users")
		.select("id,email,role,branch_id,created_at,branch:branches(name)")
		.eq("company_id", ceo.companyId)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	
	return NextResponse.json({ users: data ?? [] });
});

export const POST = withApiHandler(async (req) => {
	const ceo = await TenantStaffService.getCeoSession();
	const body = await req.json().catch(() => { throw new ValidationError("Cuerpo de la petición inválido") });
	
	const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body?.password === "string" ? body.password : "";
	const role = TenantStaffService.normalizeRole(body?.role);
	const branchId = typeof body?.branch_id === "string" && body.branch_id.trim().length > 0 ? body.branch_id.trim() : null;
	const allowedTabs = TenantStaffService.normalizeTabs(body?.allowed_tabs);

	if (!email || !password) throw new ValidationError("Email y contraseña son obligatorios");
	if (branchId) await TenantStaffService.verifyBranchOwnership(branchId, ceo.companyId);

	const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
	});
	if (authError) throw new ValidationError(authError.message);

	const insertPayload: Record<string, unknown> = {
		email,
		role: TENANT_ALLOWED_ROLES.has(role) ? role : "cashier",
		company_id: ceo.companyId,
		branch_id: branchId,
		auth_user_id: authUser.user?.id,
		auth_id: authUser.user?.id,
		created_by: ceo.userId,
	};
	
	if (allowedTabs && allowedTabs.length > 0) {
		insertPayload.allowed_tabs = allowedTabs;
	}

	const { error } = await supabaseAdmin.from("users").insert(insertPayload);
	if (error) {
		if (insertPayload.allowed_tabs && (error.message?.includes("allowed_tabs") || error.message?.includes("column"))) {
			delete insertPayload.allowed_tabs;
			const retry = await supabaseAdmin.from("users").insert(insertPayload);
			if (retry.error) throw new ValidationError(retry.error.message);
		} else {
			throw new ValidationError(error.message);
		}
	}
	
	return NextResponse.json({ success: true });
});

export const PUT = withApiHandler(async (req) => {
	const ceo = await TenantStaffService.getCeoSession();
	const b = await req.json().catch(() => { throw new ValidationError("Cuerpo de la petición inválido") });
	
	const id = typeof b?.id === "string" ? b.id.trim() : null;
	const email = typeof b?.email === "string" ? (b.email as string).trim().toLowerCase() : "";
	const role = TenantStaffService.normalizeRole(b?.role);
	const password = typeof b?.password === "string" && (b.password as string).trim().length > 0 ? (b.password as string).trim() : null;
	const branchId = typeof b?.branch_id === "string" && (b.branch_id as string).trim().length > 0 ? (b.branch_id as string).trim() : null;
	const allowedTabs = TenantStaffService.normalizeTabs(b?.allowed_tabs);

	if (!id || !email || !role) throw new ValidationError("Faltan id, correo o rol");
	if (!TENANT_ALLOWED_ROLES.has(role)) throw new ValidationError("Rol debe ser ceo o cashier");

	const { data: userRow, error: userError } = await supabaseAdmin
		.from("users")
		.select("id,auth_id,company_id")
		.eq("id", id)
		.maybeSingle();

	if (userError) throw new ValidationError(userError.message);
	if (!userRow) throw new NotFoundError("Usuario no encontrado");
	if (userRow.company_id !== ceo.companyId) throw new ForbiddenError("Solo puedes editar usuarios de tu empresa");

	if (branchId) await TenantStaffService.verifyBranchOwnership(branchId, ceo.companyId);

	if (userRow.auth_id) {
		if (password) {
			const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(userRow.auth_id, { password });
			if (passError) throw new ValidationError(passError.message);
		}
		const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(userRow.auth_id, { email });
		if (emailError) throw new ValidationError(emailError.message);
	}

	const updatePayload: Record<string, unknown> = { email, role, branch_id: branchId };
	if (allowedTabs !== null) updatePayload.allowed_tabs = allowedTabs.length > 0 ? allowedTabs : null;

	const { error } = await supabaseAdmin.from("users").update(updatePayload).eq("id", id);
	if (error) {
		if (updatePayload.allowed_tabs !== undefined && (error.message?.includes("allowed_tabs") || error.message?.includes("column"))) {
			delete updatePayload.allowed_tabs;
			const retry = await supabaseAdmin.from("users").update(updatePayload).eq("id", id);
			if (retry.error) throw new ValidationError(retry.error.message);
		} else {
			throw new ValidationError(error.message);
		}
	}
	return NextResponse.json({ success: true });
});

export const DELETE = withApiHandler(async (req) => {
	const ceo = await TenantStaffService.getCeoSession();
	const body = await req.json().catch(() => { throw new ValidationError("Cuerpo de la petición inválido") });
	
	const id = typeof body?.id === "string" ? body.id.trim() : null;
	if (!id) throw new ValidationError("Falta el id del usuario");
	if (id === ceo.userId) throw new ValidationError("No puedes eliminarte a ti mismo");

	const { data: userRow, error: userError } = await supabaseAdmin
		.from("users")
		.select("id,auth_id,email,company_id")
		.eq("id", id)
		.maybeSingle();

	if (userError) throw new ValidationError(userError.message);
	if (!userRow) throw new NotFoundError("Usuario no encontrado");
	if (userRow.company_id !== ceo.companyId) throw new ForbiddenError("Solo puedes eliminar usuarios de tu empresa");

	if (userRow.auth_id) {
		const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userRow.auth_id);
		if (authError) throw new ValidationError(authError.message);
	}
	
	const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
	if (error) throw new ValidationError(error.message);
	
	return NextResponse.json({ success: true });
});
