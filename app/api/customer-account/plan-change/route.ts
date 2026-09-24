import { NextRequest, NextResponse } from "next/server";

import { resolveCompanyContact } from "@/lib/billing/company-contact";
import {
	createPortalOrder,
	findOpenOrder,
	findPublicPlan,
	loadPortalBillingContext,
	planMonthlyUsd,
} from "@/lib/billing/portal-billing";
import { isSubscriptionOrderKind } from "@/lib/billing/portal-orders";
import { formatUsd, quotePlanChange, type PlanChangeQuote } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { formatEmailDate, timeZoneForCountry } from "@/lib/email/format";
import { sendEmail } from "@/lib/email/send";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import { syncCompanyPanelAccessFromPlanId } from "@/lib/super-admin/sync-company-panel-access";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Cambiar de plan desde /cuenta:
 * - subir: se paga la diferencia por los días que quedan y el plan cambia al pagarse;
 * - bajar: se programa para el vencimiento (sin reembolso) y se puede anular (DELETE);
 * - mismo precio o en prueba: cambio inmediato sin cobro.
 * Con la suscripción vencida no se cambia de plan aquí: se renueva eligiendo el plan.
 */

type Impact = { id: string; level: "block" | "info"; title: string; detail: string };

const BLOCK_REASON_COPY: Record<Extract<PlanChangeQuote, { mode: "blocked" }>["reason"], { title: string; detail: string }> = {
	cancelling: {
		title: "Tu suscripción está cancelada",
		detail: "Reactívala (es gratis mientras no venza) para poder cambiar de plan.",
	},
	payment_pending: {
		title: "Estamos validando tu primer pago",
		detail: "Podrás cambiar de plan en cuanto quede activo.",
	},
	expired: {
		title: "Tu suscripción venció",
		detail: "Renueva eligiendo este plan: pagas los meses que quieras y vuelves a estar en línea.",
	},
	open_ended: {
		title: "Tu cuenta no tiene fecha de vencimiento",
		detail: "Los cambios de plan de esta cuenta los hace nuestro equipo. Escríbenos por Soporte.",
	},
};

function formatDate(iso: string): string {
	const date = new Date(iso);
	return Number.isFinite(date.getTime())
		? new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" }).format(date)
		: iso;
}

async function buildPreview(companyId: string, targetPlanId: string) {
	const billing = await loadPortalBillingContext(companyId);
	if (!billing) return { error: "Empresa no encontrada", status: 404 } as const;

	const target = findPublicPlan(billing, targetPlanId);
	if (!target) return { error: "Ese plan no está disponible.", status: 400 } as const;
	if (billing.currentPlan?.id === target.id) return { error: "Ya estás en ese plan.", status: 400 } as const;

	const [{ count: activeBranches }, { count: activeUsers }] = await Promise.all([
		supabaseAdmin.from("branches").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
		supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
	]);

	const country = billing.company.country;
	const currentMonthly = planMonthlyUsd(billing.currentPlan, country);
	const targetMonthly = planMonthlyUsd(target, country);
	const quote = quotePlanChange({
		phase: billing.phase,
		currentMonthly,
		targetMonthly,
		endsAt: billing.company.subscription_ends_at,
	});

	const extraBranches = billing.branchExtras.reduce((sum, extra) => sum + extra.quantity, 0);
	const branchesCount = Number(activeBranches ?? 0);
	const usersCount = Number(activeUsers ?? 0);
	const targetEffectiveBranches = target.max_branches == null ? null : target.max_branches + extraBranches;
	const scheduledTarget = billing.scheduledChange
		? billing.plans.find((plan) => plan.id === billing.scheduledChange?.target_plan_id) ?? null
		: null;
	const openOrder = findOpenOrder(billing, (kind) => isSubscriptionOrderKind(kind.kind));

	const impacts: Impact[] = [];
	if (quote.mode === "blocked") {
		impacts.push({ id: `phase-${quote.reason}`, level: "block", ...BLOCK_REASON_COPY[quote.reason] });
	}
	if (openOrder) {
		impacts.push({
			id: "open-order",
			level: "block",
			title: "Tienes un pago pendiente de tu plan",
			detail: "Págalo o anúlalo en «Pagos pendientes» antes de cambiar de plan.",
		});
	}
	if (targetEffectiveBranches != null && branchesCount > targetEffectiveBranches) {
		impacts.push({
			id: "branches-over-limit",
			level: "block",
			title: "Tienes más sucursales de las que permite ese plan",
			detail: `Tienes ${branchesCount} sucursales activas y el plan ${target.name} permite ${targetEffectiveBranches}. Desactiva ${branchesCount - targetEffectiveBranches} antes de cambiar.`,
		});
	}
	if (target.max_users != null && usersCount > target.max_users) {
		impacts.push({
			id: "users-over-limit",
			level: "block",
			title: "Tienes más usuarios de los que permite ese plan",
			detail: `Tienes ${usersCount} usuarios activos y el plan ${target.name} permite ${target.max_users}. Desactiva ${usersCount - target.max_users} antes de cambiar.`,
		});
	}
	if (quote.mode === "downgrade") {
		impacts.push({
			id: "downgrade-at-cycle-end",
			level: "info",
			title: `Se aplica el ${formatDate(quote.effectiveAt)}`,
			detail: `Hasta entonces sigues con ${billing.currentPlan?.name ?? "tu plan actual"}. Lo ya pagado no se reembolsa.`,
		});
	}
	if (scheduledTarget && scheduledTarget.id !== target.id && quote.mode !== "blocked") {
		impacts.push({
			id: "replaces-schedule",
			level: "info",
			title: `Reemplaza el cambio programado a ${scheduledTarget.name}`,
			detail: quote.mode === "downgrade" ? "Solo puede haber un cambio programado." : "El cambio programado se anula.",
		});
	}
	for (const addon of billing.activeAddons) {
		const snapshot = { id: addon.addonId, slug: addon.slug, name: addon.name, type: addon.type, description: addon.description };
		const current = resolveAddonOfferForPlan(billing.currentPlan, snapshot);
		const next = resolveAddonOfferForPlan(target, snapshot);
		if (next.status === "included" && current.status !== "included") {
			impacts.push({
				id: `addon-included-${addon.addonId}`,
				level: "info",
				title: `${addon.name} viene incluido en ${target.name}`,
				detail: "Desde tu próxima renovación deja de cobrarse aparte.",
			});
		} else if (next.status === "blocked") {
			impacts.push({
				id: `addon-policy-${addon.addonId}`,
				level: "info",
				title: `${addon.name} no se ofrece en ${target.name}`,
				detail: "Lo conservas, pero si tienes dudas escríbenos antes de cambiar.",
			});
		}
	}

	return {
		preview: {
			phase: billing.phase,
			currentPlan: billing.currentPlan
				? { id: billing.currentPlan.id, name: billing.currentPlan.name, monthly: currentMonthly }
				: null,
			targetPlan: {
				id: target.id,
				name: target.name,
				monthly: targetMonthly,
				max_branches: target.max_branches,
				max_users: target.max_users,
			},
			quote,
			counts: {
				activeBranches: branchesCount,
				activeUsers: usersCount,
				extraBranches,
				targetEffectiveBranches,
			},
			impacts,
			scheduledChange: billing.scheduledChange
				? {
						id: billing.scheduledChange.id,
						targetPlanId: billing.scheduledChange.target_plan_id,
						targetPlanName: scheduledTarget?.name ?? null,
						effectiveAt: billing.scheduledChange.effective_at,
					}
				: null,
			openOrderId: openOrder?.id ?? null,
		},
		billing,
		target,
	} as const;
}

export async function GET(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "plan_change_get", 40, 60_000);
	if (limited) return limited;

	const targetPlanId = String(req.nextUrl.searchParams.get("targetPlanId") ?? "").trim();
	if (!targetPlanId) return NextResponse.json({ error: "Elige un plan." }, { status: 400 });

	const result = await buildPreview(ctx.companyId, targetPlanId);
	if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
	return NextResponse.json({ ok: true, preview: result.preview });
}

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "plan_change_post", 10, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { targetPlanId?: string };
	const targetPlanId = String(body.targetPlanId ?? "").trim();
	if (!targetPlanId) return NextResponse.json({ error: "Elige un plan." }, { status: 400 });

	const result = await buildPreview(ctx.companyId, targetPlanId);
	if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
	const { preview, billing, target } = result;

	const block = preview.impacts.find((impact) => impact.level === "block");
	if (block) return NextResponse.json({ error: block.detail, impacts: preview.impacts }, { status: 409 });

	const nowIso = new Date().toISOString();
	const { quote } = preview;

	if (quote.mode === "switch") {
		const { error } = await supabaseAdmin
			.from("companies")
			.update({ plan_id: target.id, updated_at: nowIso })
			.eq("id", ctx.companyId);
		if (error) return NextResponse.json({ error: "No se pudo cambiar el plan." }, { status: 500 });
		await syncCompanyPanelAccessFromPlanId(ctx.companyId, target.id);
		await supabaseAdmin
			.from("company_plan_change_schedules")
			.update({ status: "cancelled", updated_at: nowIso })
			.eq("company_id", ctx.companyId)
			.eq("status", "scheduled");
		return NextResponse.json({ ok: true, applied: true, message: `Listo: ya estás en el plan ${target.name}.` });
	}

	if (quote.mode === "downgrade") {
		const schedule = {
			current_plan_id: billing.currentPlan?.id ?? null,
			target_plan_id: target.id,
			requested_by_email: ctx.email,
			effective_at: quote.effectiveAt,
			reason: "Cambio a un plan menor desde /cuenta",
			metadata: { monthlyDiff: quote.monthlyDiff },
			updated_at: nowIso,
		};
		const { error } = billing.scheduledChange
			? await supabaseAdmin.from("company_plan_change_schedules").update(schedule).eq("id", billing.scheduledChange.id)
			: await supabaseAdmin
					.from("company_plan_change_schedules")
					.insert({ ...schedule, company_id: ctx.companyId, status: "scheduled" });
		if (error) return NextResponse.json({ error: "No se pudo programar el cambio." }, { status: 500 });

		const contact = await resolveCompanyContact(supabaseAdmin, ctx.companyId);
		if (contact.email) {
			await sendEmail({
				kind: "plan_change_scheduled",
				to: contact.email,
				companyId: ctx.companyId,
				data: {
					name: contact.responsibleName || undefined,
					businessName: contact.businessName,
					currentPlan: billing.currentPlan?.name ?? "tu plan actual",
					targetPlan: target.name,
					effectiveAt: formatEmailDate(quote.effectiveAt, timeZoneForCountry(contact.country)) || formatDate(quote.effectiveAt),
				},
			});
		}
		return NextResponse.json({
			ok: true,
			scheduled: { targetPlanId: target.id, targetPlanName: target.name, effectiveAt: quote.effectiveAt },
			message: `Programado: pasarás al plan ${target.name} el ${formatDate(quote.effectiveAt)}.`,
		});
	}

	if (quote.mode !== "upgrade") {
		return NextResponse.json({ error: "Este cambio no se puede hacer desde aquí." }, { status: 409 });
	}

	const created = await createPortalOrder({
		companyId: ctx.companyId,
		planId: target.id,
		kind: "plan_change",
		amount: quote.amount,
	});
	if (!created.ok) return NextResponse.json({ error: created.error }, { status: 500 });

	return NextResponse.json({
		ok: true,
		order: created.order,
		message: `Paga ${formatUsd(quote.amount)} y el plan ${target.name} se activa al instante con PayPal, o cuando validemos tu comprobante.`,
	});
}

/** Anula el cambio a un plan menor que estaba programado. */
export async function DELETE() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "plan_change_delete", 10, 60_000);
	if (limited) return limited;

	const { data, error } = await supabaseAdmin
		.from("company_plan_change_schedules")
		.update({ status: "cancelled", updated_at: new Date().toISOString() })
		.eq("company_id", ctx.companyId)
		.eq("status", "scheduled")
		.select("id");
	if (error) return NextResponse.json({ error: "No se pudo anular el cambio programado." }, { status: 500 });
	if (!data?.length) return NextResponse.json({ error: "No hay ningún cambio programado." }, { status: 404 });
	return NextResponse.json({ ok: true, message: "Anulamos el cambio programado: sigues con tu plan actual." });
}
