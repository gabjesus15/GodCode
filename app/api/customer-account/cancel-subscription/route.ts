import { NextRequest, NextResponse } from "next/server";

import { resolveCompanyContact } from "@/lib/billing/company-contact";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { cleanMultilineText } from "@/lib/infra/server-sanitize";
import { formatEmailDate, timeZoneForCountry } from "@/lib/email/format";
import { sendEmail } from "@/lib/email/send";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Cancelar al vencimiento: la tienda sigue online hasta `subscription_ends_at` y después se
 * suspende. Mientras no venza, el dueño puede reactivarla gratis.
 */

type CompanyRow = {
	id: string;
	name: string;
	subscription_status: string | null;
	subscription_ends_at: string | null;
};

function formatDate(iso: string): string {
	const date = new Date(iso);
	return Number.isFinite(date.getTime())
		? new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" }).format(date)
		: iso;
}

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "cancel_post", 10, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { reason?: string };
	const reason = cleanMultilineText(body.reason, 500);

	const { data: company, error } = await supabaseAdmin
		.from("companies")
		.select("id,name,subscription_status,subscription_ends_at")
		.eq("id", ctx.companyId)
		.maybeSingle();
	if (error) return NextResponse.json({ error: "No pudimos leer tu suscripción." }, { status: 500 });

	const companyRow = company as CompanyRow | null;
	if (!companyRow?.id) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

	const status = String(companyRow.subscription_status ?? "").trim().toLowerCase();
	const endsAt = companyRow.subscription_ends_at ?? null;
	const current = endsAt != null && new Date(endsAt).getTime() > Date.now();
	if (!endsAt) {
		return NextResponse.json({ error: "Tu suscripción no tiene fecha de vencimiento. Escríbenos para cancelarla." }, { status: 400 });
	}
	if (status === "cancelled" && current) {
		return NextResponse.json({
			ok: true,
			message: `Tu cancelación ya estaba programada. La tienda sigue online hasta el ${formatDate(endsAt)}.`,
			subscriptionStatus: "cancelled",
			subscriptionEndsAt: endsAt,
		});
	}
	// Solo se cancela una suscripción activa y vigente. Si no, "Cancelar" + "Reactivar"
	// servía para levantar una suspensión o pasar una prueba o un pago pendiente a activa.
	if (status !== "active" || !current) {
		return NextResponse.json(
			{ error: "Solo puedes cancelar una suscripción activa. Si tienes dudas, escríbenos por Soporte." },
			{ status: 409 },
		);
	}

	const nowIso = new Date().toISOString();
	const { error: updateError } = await supabaseAdmin
		.from("companies")
		.update({ subscription_status: "cancelled", updated_at: nowIso })
		.eq("id", ctx.companyId)
		.eq("subscription_status", companyRow.subscription_status ?? "active");
	if (updateError) return NextResponse.json({ error: "No se pudo programar la cancelación." }, { status: 500 });

	// Registro para el equipo (motivo de baja). Es "system": no aparece en el Soporte del dueño.
	await supabaseAdmin.from("saas_tickets").insert({
		company_id: ctx.companyId,
		created_by_email: ctx.email,
		source: "system",
		subject: `Cancelación programada · ${companyRow.name}`,
		description: [
			`Sigue online hasta: ${formatDate(endsAt)}`,
			`Motivo: ${reason || "No indicado"}`,
		].join("\n"),
		category: "billing",
		priority: "low",
		status: "resolved",
		last_message_at: nowIso,
		resolved_at: nowIso,
	});

	const contact = await resolveCompanyContact(supabaseAdmin, ctx.companyId);
	if (contact.email) {
		await sendEmail({
			kind: "subscription_cancelled",
			to: contact.email,
			companyId: ctx.companyId,
			data: {
				name: contact.responsibleName || undefined,
				businessName: contact.businessName,
				endsAt: formatEmailDate(endsAt, timeZoneForCountry(contact.country)) || formatDate(endsAt),
			},
		});
	}

	return NextResponse.json({
		ok: true,
		message: `Cancelación programada. Tu tienda sigue online hasta el ${formatDate(endsAt)}; puedes reactivarla gratis antes de esa fecha.`,
		subscriptionStatus: "cancelled",
		subscriptionEndsAt: endsAt,
	});
}
