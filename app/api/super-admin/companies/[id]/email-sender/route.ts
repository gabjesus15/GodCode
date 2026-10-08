import { NextRequest, NextResponse } from "next/server";

import { deleteCompanySender, getCompanySender, saveCompanySender } from "@/lib/email/company-sender";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { getEffectiveCustomDomain } from "@/lib/tenant/tenant-effective-custom-domain";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin */

/**
 * Resend propio de la empresa para los cupones por correo. El dueño lo configura
 * desde el panel (pestaña Cupones); esta ruta es para cuando nos pide que lo hagamos
 * nosotros. Sin dominio propio vigente los cupones salen por el Resend de GodCode y
 * aquí no hay nada que configurar.
 */

type Context = { params: Promise<{ id: string }> };

async function loadCompanyDomain(companyId: string) {
	const { data } = await supabaseAdmin
		.from("companies")
		.select("custom_domain, subscription_status, subscription_ends_at")
		.eq("id", companyId)
		.maybeSingle();
	if (!data) return { found: false as const, customDomain: null };
	const row = data as { custom_domain: string | null; subscription_status: string | null; subscription_ends_at: string | null };
	return {
		found: true as const,
		customDomain: getEffectiveCustomDomain(row.custom_domain, row.subscription_ends_at, row.subscription_status),
	};
}

export async function GET(_req: NextRequest, context: Context) {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status });
	const { id: companyId } = await context.params;

	const company = await loadCompanyDomain(companyId);
	if (!company.found) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
	try {
		const sender = await getCompanySender(companyId);
		return NextResponse.json({ customDomain: company.customDomain, sender });
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo leer" }, { status: 500 });
	}
}

export async function PUT(req: NextRequest, context: Context) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status });
	const { id: companyId } = await context.params;

	let body: Record<string, unknown>;
	try {
		body = (await req.json()) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
	}

	const company = await loadCompanyDomain(companyId);
	if (!company.found) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
	if (!company.customDomain) {
		return NextResponse.json(
			{ error: "La empresa no tiene dominio propio vigente: sus cupones salen por el Resend de GodCode." },
			{ status: 400 },
		);
	}

	const result = await saveCompanySender({
		companyId,
		apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
		fromEmail: typeof body.fromEmail === "string" ? body.fromEmail : "",
		fromName: typeof body.fromName === "string" ? body.fromName : "",
		replyTo: typeof body.replyTo === "string" ? body.replyTo : "",
		testTo: permission.email ?? "",
		actorEmail: permission.email ?? "super-admin",
	});
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "company.email_sender.save",
		resourceType: "company",
		resourceId: companyId,
		companyId,
		// Nunca la key: solo qué cambió.
		metadata: { fromEmail: String(body.fromEmail ?? ""), keyChanged: Boolean(String(body.apiKey ?? "").trim()) },
	});

	return NextResponse.json({ ok: true, testSentTo: permission.email ?? null, sender: await getCompanySender(companyId) });
}

export async function DELETE(_req: NextRequest, context: Context) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status });
	const { id: companyId } = await context.params;

	try {
		await deleteCompanySender(companyId);
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo quitar" }, { status: 500 });
	}
	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "company.email_sender.delete",
		resourceType: "company",
		resourceId: companyId,
		companyId,
	});
	return NextResponse.json({ ok: true });
}
