import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { sendOnboardingEmail } from "../../../../lib/onboarding/emails";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { checkRateLimit } from "@/lib/infra/rate-limiter";
import { sanitizeServerText } from "@/lib/infra/server-sanitize";

type CompanyRow = {
	id: string;
	name: string;
	email: string | null;
	subscription_status: string | null;
	subscription_ends_at: string | null;
};

async function resolveCompanyPrimaryContact(companyId: string, fallbackName: string, fallbackEmail: string | null) {
	const { data: app } = await supabaseAdmin
		.from("onboarding_applications")
		.select("email,responsible_name,business_name")
		.eq("company_id", companyId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	return {
		email: String(app?.email ?? fallbackEmail ?? "").trim(),
		responsibleName: String(app?.responsible_name ?? "Cliente"),
		businessName: String(app?.business_name ?? fallbackName),
	};
}

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	if (!(await checkRateLimit(`cancel_post:${ctx.companyId}`, 10, 60000))) {
		return NextResponse.json({ error: "Demasiadas peticiones. Intenta en un minuto." }, { status: 429 });
	}

	const body = (await req.json().catch(() => ({}))) as {
		reason?: string;
	};

	const reason = sanitizeServerText(body.reason);
	const { data: company, error } = await supabaseAdmin
		.from("companies")
		.select("id,name,email,subscription_status,subscription_ends_at")
		.eq("id", ctx.companyId)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const companyRow = company as CompanyRow | null;
	if (!companyRow?.id) {
		return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
	}

	const nowIso = new Date().toISOString();
	const existingStatus = String(companyRow.subscription_status ?? "").trim().toLowerCase();
	const endsAt = companyRow.subscription_ends_at ?? null;
	const alreadyScheduled = existingStatus === "cancelled" && endsAt && new Date(endsAt).getTime() > Date.now();

	if (!endsAt) {
		return NextResponse.json(
			{ error: "No pudimos determinar la fecha de vencimiento de tu suscripcion." },
			{ status: 400 }
		);
	}

	if (!alreadyScheduled) {
		const { error: updateError } = await supabaseAdmin
			.from("companies")
			.update({
				subscription_status: "cancelled",
				updated_at: nowIso,
			})
			.eq("id", ctx.companyId);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}
	}

	await supabaseAdmin.from("saas_tickets").insert({
		company_id: ctx.companyId,
		created_by_email: ctx.email,
		source: "tenant",
		subject: `Cancelacion programada del plan · ${companyRow.name}`,
		description: [
			`Empresa: ${companyRow.name}`,
			`Estado anterior: ${companyRow.subscription_status ?? "sin estado"}`,
			`Fecha de vencimiento: ${endsAt}`,
			`Motivo: ${reason || "No indicado"}`,
			"Resultado: la suscripcion queda programada para terminar al vencimiento del ciclo actual.",
		].join("\n"),
		category: "billing",
		priority: "medium",
		status: "resolved",
		last_message_at: nowIso,
		resolved_at: nowIso,
	});

	const contact = await resolveCompanyPrimaryContact(ctx.companyId, companyRow.name, companyRow.email);
	if (contact.email) {
		await sendOnboardingEmail({
			type: "status_cancelled_scheduled",
			to: contact.email,
			from: process.env.RESEND_FROM ?? "noreply@example.com",
			apiKey: process.env.RESEND_API_KEY ?? "",
			responsibleName: contact.responsibleName,
			businessName: contact.businessName,
			endsAt,
			panelUrl: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
		});
	}

	return NextResponse.json({
		ok: true,
		message: alreadyScheduled
			? "Tu cancelacion ya estaba programada. La suscripcion seguira activa hasta su vencimiento."
			: "Tu suscripcion quedo cancelada para el siguiente vencimiento. El servicio seguira activo hasta esa fecha.",
		subscriptionStatus: "cancelled",
		subscriptionEndsAt: endsAt,
	});
}
