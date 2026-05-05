import { NextRequest, NextResponse } from "next/server";

import { buildAdminAuditLogRow } from "@/lib/super-admin/admin-audit-row";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";
import { createSupabaseServerClient } from "../../../../../utils/supabase/server";

type FactorLike = { id?: string; factor_type?: string; type?: string; status?: string };

/** Obtiene el id del factor TOTP verificado del payload de `mfa.listFactors()`. */
function extractVerifiedTotpFactorId(factorsPayload: unknown): string | null {
	if (Array.isArray(factorsPayload)) {
		for (const x of factorsPayload) {
			if (!x || typeof x !== "object") continue;
			const f = x as FactorLike;
			const t = String(f.factor_type ?? f.type ?? "").toLowerCase();
			const st = String(f.status ?? "").toLowerCase();
			if (t === "totp" && st === "verified" && f.id) return String(f.id);
		}
		return null;
	}
	if (!factorsPayload || typeof factorsPayload !== "object") return null;
	const raw = factorsPayload as Record<string, unknown>;
	const candidates: FactorLike[] = [];
	if (Array.isArray(raw.all)) {
		for (const x of raw.all) {
			if (x && typeof x === "object") candidates.push(x as FactorLike);
		}
	}
	if (Array.isArray(raw.totp)) {
		for (const x of raw.totp) {
			if (x && typeof x === "object") candidates.push(x as FactorLike);
		}
	}
	for (const f of candidates) {
		const t = String(f.factor_type ?? f.type ?? "").toLowerCase();
		const st = String(f.status ?? "").toLowerCase();
		if (t === "totp" && st === "verified" && f.id) return String(f.id);
	}
	return null;
}

export async function DELETE(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as { id?: string; totpCode?: string };
	const id = typeof body.id === "string" ? body.id.trim() : "";
	const totpDigits = typeof body.totpCode === "string" ? body.totpCode.replace(/\s/g, "") : "";

	if (!id) {
		return NextResponse.json({ error: "id requerido" }, { status: 400 });
	}
	if (!/^\d{6}$/.test(totpDigits)) {
		return NextResponse.json({ error: "Introduce el código de 6 dígitos de Google Authenticator." }, { status: 400 });
	}

	const supabase = await createSupabaseServerClient("super-admin");
	const mfaApi = supabase.auth.mfa;
	if (!mfaApi?.listFactors || !mfaApi.challengeAndVerify) {
		return NextResponse.json({ error: "MFA no disponible en el cliente de autenticación." }, { status: 501 });
	}

	const { data: factorsData, error: factorsError } = await mfaApi.listFactors();
	if (factorsError) {
		console.error("[super-admin/companies/delete] listFactors", factorsError);
		return NextResponse.json({ error: "No se pudo comprobar el autenticador." }, { status: 500 });
	}

	const factorId = extractVerifiedTotpFactorId(factorsData);
	if (!factorId) {
		return NextResponse.json(
			{
				error:
					"Tu usuario de administrador no tiene MFA TOTP activado y verificado. Configura Google Authenticator (MFA) en tu cuenta de Supabase Auth para este usuario antes de eliminar empresas.",
			},
			{ status: 403 }
		);
	}

	const { error: mfaVerifyError } = await mfaApi.challengeAndVerify({
		factorId,
		code: totpDigits,
	});
	if (mfaVerifyError) {
		return NextResponse.json(
			{ error: "Código de autenticación inválido o caducado. Genera uno nuevo en la app e inténtalo otra vez." },
			{ status: 401 }
		);
	}

	const { data: company, error: loadError } = await supabaseAdmin
		.from("companies")
		.select("id,name,public_slug")
		.eq("id", id)
		.maybeSingle();

	if (loadError) {
		return NextResponse.json({ error: "No se pudo cargar la empresa" }, { status: 500 });
	}
	if (!company) {
		return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
	}

	const { error: deleteError } = await supabaseAdmin.from("companies").delete().eq("id", id);

	if (deleteError) {
		const msg = deleteError.message?.includes("violates foreign key")
			? "No se puede eliminar: hay datos vinculados que impiden el borrado. Revisa logs o contacta a ingeniería."
			: deleteError.message || "No se pudo eliminar la empresa";
		return NextResponse.json({ error: msg }, { status: 500 });
	}

	const auditRow = buildAdminAuditLogRow({
		actorEmail: permission.email ?? null,
		action: "company.delete",
		targetType: "company",
		targetId: id,
		companyId: null,
		metadata: {
			deleted_name: company.name ?? null,
			public_slug: company.public_slug ?? null,
			actor_role: permission.role ?? null,
			mfa_totp_verified: true,
		},
	});

	const { error: auditError } = await supabaseAdmin.from("admin_audit_logs").insert(auditRow);
	if (auditError) {
		console.error("[super-admin/companies/delete] audit insert", auditError);
	}

	return NextResponse.json({ ok: true });
}
