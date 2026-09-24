import { randomUUID } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { roundUsd } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { activateCompanySubscription } from "@/lib/onboarding/billing-activation";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin
 *
 * Acciones del super admin sobre la suscripción de una empresa, en el servidor y con
 * auditoría (antes se escribían desde el navegador contra la base):
 * - `extend`: suma meses (desde el vencimiento vigente o desde hoy), reactiva, extiende los
 *   extras mensuales y, si se pide, registra el pago recibido.
 * - `set_status`: activa, suspende o marca cancelada.
 */

type Body =
	| { action: "extend"; months?: number; registerPayment?: boolean; amountUsd?: number; note?: string }
	| { action: "set_status"; status?: string };

const SETTABLE_STATUSES = new Set(["active", "suspended", "cancelled"]);

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const { id: companyId } = await context.params;
	const body = (await req.json().catch(() => ({}))) as Body;

	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("id,public_slug,plan_id,subscription_status,subscription_ends_at,plan:plans(name)")
		.eq("id", companyId)
		.maybeSingle();
	if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

	const planRelation = (company as { plan?: { name?: string | null } | Array<{ name?: string | null }> | null }).plan;
	const planName = String((Array.isArray(planRelation) ? planRelation[0]?.name : planRelation?.name) ?? "").toLowerCase();
	const now = new Date();

	if (body.action === "extend") {
		const months = Math.floor(Number(body.months ?? 0));
		if (!(months >= 1 && months <= 24)) {
			return NextResponse.json({ error: "Indica entre 1 y 24 meses." }, { status: 400 });
		}
		if (planName.includes("dev")) {
			return NextResponse.json({ error: "El plan interno no vence: no hace falta extenderlo." }, { status: 409 });
		}
		const amount = roundUsd(Number(body.amountUsd ?? 0));
		if (body.registerPayment && !(amount > 0)) {
			return NextResponse.json({ error: "Indica el monto recibido (en USD) o desmarca «Registrar pago»." }, { status: 400 });
		}
		if (body.registerPayment && !company.plan_id) {
			return NextResponse.json({ error: "Asigna un plan antes de registrar un pago." }, { status: 409 });
		}

		await activateCompanySubscription({ supabaseAdmin, companyId, monthsPaid: months, now });

		let paymentId: string | null = null;
		if (body.registerPayment && company.plan_id) {
			const { data: payment, error: paymentError } = await supabaseAdmin
				.from("payments_history")
				.insert({
					company_id: companyId,
					plan_id: company.plan_id,
					amount_paid: amount,
					months_paid: months,
					payment_method: "Registro manual",
					payment_method_slug: "manual",
					payment_reference: `ADMIN-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`,
					payment_date: now.toISOString(),
					status: "paid",
				})
				.select("id")
				.single();
			if (paymentError) {
				return NextResponse.json(
					{ error: "La suscripción se extendió, pero no se pudo registrar el pago. Anótalo a mano." },
					{ status: 500 },
				);
			}
			paymentId = payment?.id ?? null;
		}

		const { data: after } = await supabaseAdmin.from("companies").select("subscription_ends_at").eq("id", companyId).maybeSingle();
		revalidateTag(`menu:${companyId}`, "max");
		if (company.public_slug) revalidateTag(`company-slug:${company.public_slug}`, "max");

		await logAdminAudit({
			actorEmail: permission.email ?? "",
			actorRole: permission.role,
			action: "billing.extend",
			resourceType: "company",
			resourceId: companyId,
			companyId,
			metadata: {
				months,
				registered_payment: Boolean(paymentId),
				amount_usd: paymentId ? amount : 0,
				note: String(body.note ?? "").trim().slice(0, 200) || null,
				ends_at_before: company.subscription_ends_at,
				ends_at_after: after?.subscription_ends_at ?? null,
			},
		});

		return NextResponse.json({ ok: true, subscriptionEndsAt: after?.subscription_ends_at ?? null, paymentId });
	}

	if (body.action === "set_status") {
		const status = String(body.status ?? "").trim().toLowerCase();
		if (!SETTABLE_STATUSES.has(status)) {
			return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
		}
		const endsAt = company.subscription_ends_at ? new Date(company.subscription_ends_at).getTime() : null;
		// Activar una suscripción vencida no sirve: el cron la volvería a suspender en minutos.
		if (status === "active" && endsAt != null && endsAt <= now.getTime()) {
			return NextResponse.json(
				{ error: "Esta suscripción ya venció. Extiéndela (con o sin pago) para reactivarla." },
				{ status: 409 },
			);
		}
		const { error } = await supabaseAdmin
			.from("companies")
			.update({ subscription_status: status, updated_at: now.toISOString() })
			.eq("id", companyId);
		if (error) return NextResponse.json({ error: "No se pudo cambiar el estado." }, { status: 500 });

		revalidateTag(`menu:${companyId}`, "max");
		if (company.public_slug) revalidateTag(`company-slug:${company.public_slug}`, "max");
		await logAdminAudit({
			actorEmail: permission.email ?? "",
			actorRole: permission.role,
			action: "company.status.update",
			resourceType: "company",
			resourceId: companyId,
			companyId,
			metadata: { from: company.subscription_status, to: status },
		});
		return NextResponse.json({ ok: true, subscriptionStatus: status });
	}

	return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
}
