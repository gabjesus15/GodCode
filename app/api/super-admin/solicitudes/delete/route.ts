import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getDeletePolicy } from "@/lib/super-admin/solicitudes-delete-policy";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

/** @service-role super-admin */

export async function DELETE(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as { id?: string };
	const id = typeof body.id === "string" ? body.id.trim() : "";
	if (!id) {
		return NextResponse.json({ error: "id requerido" }, { status: 400 });
	}

	const { data: app, error: appError } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,status,company_id,payment_status,payment_reference_url")
		.eq("id", id)
		.maybeSingle();

	if (appError) {
		return NextResponse.json({ error: "No se pudo cargar la solicitud" }, { status: 500 });
	}
	if (!app) {
		return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
	}

	const policy = getDeletePolicy({
		status: app.status ?? null,
		companyId: app.company_id ?? null,
		paymentStatus: app.payment_status ?? null,
		referenceFileUrl: app.payment_reference_url ?? null,
	});

	if (!policy.canDelete) {
		return NextResponse.json({ error: policy.reason ?? "No se puede eliminar esta solicitud" }, { status: 409 });
	}

	const { error: addonsError } = await supabaseAdmin
		.from("onboarding_application_addons")
		.delete()
		.eq("application_id", id);
	if (addonsError) {
		return NextResponse.json({ error: "No se pudieron eliminar addons de la solicitud" }, { status: 500 });
	}

	const { error: deleteError } = await supabaseAdmin
		.from("onboarding_applications")
		.delete()
		.eq("id", id);
	if (deleteError) {
		return NextResponse.json({ error: "No se pudo eliminar la solicitud" }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
