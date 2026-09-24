import { NextResponse } from "next/server";

import { resolveCompanyContact } from "@/lib/billing/company-contact";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { formatEmailDate, timeZoneForCountry } from "@/lib/email/format";
import { sendEmail } from "@/lib/email/send";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Deshace una cancelación programada mientras la suscripción no haya vencido. Vencida,
 * lo que corresponde es renovar (pagando).
 */

type CompanyRow = {
	id: string;
	subscription_status: string | null;
	subscription_ends_at: string | null;
};

export async function POST() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "reactivate_post", 10, 60_000);
	if (limited) return limited;

	const { data: company, error } = await supabaseAdmin
		.from("companies")
		.select("id,subscription_status,subscription_ends_at")
		.eq("id", ctx.companyId)
		.maybeSingle();
	if (error) return NextResponse.json({ error: "No pudimos leer tu suscripción." }, { status: 500 });

	const companyRow = company as CompanyRow | null;
	if (!companyRow?.id) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

	const status = String(companyRow.subscription_status ?? "").trim().toLowerCase();
	const endsAt = companyRow.subscription_ends_at ? new Date(companyRow.subscription_ends_at).getTime() : null;
	if (status !== "cancelled" || endsAt == null || !Number.isFinite(endsAt) || endsAt <= Date.now()) {
		return NextResponse.json(
			{ error: "Solo puedes reactivar una cancelación que todavía no vence. Si ya venció, renueva tu plan." },
			{ status: 409 },
		);
	}

	const { data: updated, error: updateError } = await supabaseAdmin
		.from("companies")
		.update({ subscription_status: "active", updated_at: new Date().toISOString() })
		.eq("id", ctx.companyId)
		.eq("subscription_status", companyRow.subscription_status ?? "cancelled")
		.select("id");
	if (updateError || !updated?.length) {
		return NextResponse.json({ error: "No se pudo reactivar la suscripción." }, { status: 500 });
	}

	const contact = await resolveCompanyContact(supabaseAdmin, ctx.companyId);
	if (contact.email) {
		await sendEmail({
			kind: "subscription_reactivated",
			to: contact.email,
			companyId: ctx.companyId,
			data: {
				name: contact.responsibleName || undefined,
				businessName: contact.businessName,
				endsAt: formatEmailDate(companyRow.subscription_ends_at, timeZoneForCountry(contact.country)) || undefined,
			},
		});
	}

	return NextResponse.json({
		ok: true,
		message: "Listo: tu suscripción sigue activa. Renuévala antes del vencimiento para no cortar el servicio.",
		subscriptionStatus: "active",
		subscriptionEndsAt: companyRow.subscription_ends_at,
	});
}
