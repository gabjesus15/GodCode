import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

type DeletePolicyInput = {
	status: string | null;
	companyId: string | null;
	paymentStatus: string | null;
	referenceFileUrl: string | null;
};

function getDeletePolicy(input: DeletePolicyInput): { canDelete: boolean; reason: string | null } {
	if (input.companyId) {
		return { canDelete: false, reason: "La solicitud ya fue convertida en empresa" };
	}

	const status = String(input.status ?? "").trim().toLowerCase();
	const paymentStatus = String(input.paymentStatus ?? "").trim().toLowerCase();
	const hasProof = Boolean((input.referenceFileUrl ?? "").trim());

	if (status === "active" || status === "payment_validated") {
		return { canDelete: false, reason: "La solicitud ya está activada" };
	}

	if (paymentStatus === "paid") {
		return { canDelete: false, reason: "La solicitud tiene un pago aprobado" };
	}

	if (paymentStatus === "pending_validation" || hasProof) {
		return { canDelete: false, reason: "La solicitud tiene un pago en revisión" };
	}

	const allowedStatuses = new Set(["pending_verification", "email_verified", "form_completed", "rejected", "payment_pending"]);
	if (!allowedStatuses.has(status)) {
		return { canDelete: false, reason: "Estado no elegible para eliminación" };
	}

	return { canDelete: true, reason: null };
}

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
