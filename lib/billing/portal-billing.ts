import { randomUUID } from "crypto";

import { escapeLikePattern } from "@/lib/db/like-pattern";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveAddonUnitPrice } from "@/lib/plans/addon-pricing";
import { OPEN_TICKET_STATUSES } from "@/lib/status/status-labels";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";
import { listPortalPaymentMethods } from "@/lib/tenant/customer-account-payment-methods";
import {
	classifyPortalPaymentReference,
	isOpenOrder,
	isOrderAwaitingPayment,
	type PortalPaymentKind,
} from "./portal-orders";
import { resolveSubscriptionPhase, roundUsd, type RecurringCharge, type SubscriptionPhase } from "./portal-pricing";

/**
 * Lado servidor de la facturación del portal: lee el estado de la suscripción de una
 * empresa y crea, anula o marca para revisión sus pedidos de pago. Las cuentas están en
 * `portal-pricing` (puro); los estados y referencias, en `portal-orders`.
 */

export type BillingPlanRow = {
	id: string;
	name: string;
	price: number | null;
	prices_by_continent: Record<string, { price: number; currency: string }> | null;
	max_branches: number | null;
	max_users: number | null;
	features: unknown;
	marketing_lines: unknown;
	is_active: boolean | null;
	is_public: boolean | null;
};

const PLAN_COLUMNS = "id,name,price,prices_by_continent,max_branches,max_users,features,marketing_lines,is_active,is_public";

/** Precio mensual del plan para el país del negocio (el mismo que cobra el alta), en USD. */
export function planMonthlyUsd(plan: Pick<BillingPlanRow, "price" | "prices_by_continent"> | null, country: string | null): number {
	return plan ? roundUsd(resolveRegionalPlanPrice(plan, country).price) : 0;
}

export type PortalOrderRow = {
	id: string;
	company_id: string;
	plan_id: string;
	status: string | null;
	amount_paid: number | null;
	months_paid: number | null;
	payment_reference: string | null;
	payment_method: string | null;
	payment_method_slug: string | null;
	payment_date: string | null;
	reference_file_url: string | null;
};

export const PORTAL_ORDER_COLUMNS =
	"id,company_id,plan_id,status,amount_paid,months_paid,payment_reference,payment_method,payment_method_slug,payment_date,reference_file_url";

type ActiveAddonRow = {
	addonId: string;
	name: string;
	slug: string | null;
	type: string | null;
	description: string | null;
	price_monthly: number | null;
	price_one_time: number | null;
	expires_at: string | null;
};

export type PortalBillingContext = {
	company: {
		id: string;
		name: string;
		country: string | null;
		plan_id: string | null;
		subscription_status: string | null;
		subscription_ends_at: string | null;
	};
	phase: SubscriptionPhase;
	plans: BillingPlanRow[];
	currentPlan: BillingPlanRow | null;
	scheduledChange: { id: string; target_plan_id: string; effective_at: string } | null;
	activeAddons: ActiveAddonRow[];
	/** Sucursales extra vigentes, agrupadas por precio unitario. */
	branchExtras: Array<{ unitPrice: number; quantity: number }>;
	openOrders: PortalOrderRow[];
};

export async function loadPortalBillingContext(companyId: string, now = new Date()): Promise<PortalBillingContext | null> {
	const [{ data: company }, { data: plans }, { data: schedule }, { data: addons }, { data: entitlements }, { data: orders }] =
		await Promise.all([
			supabaseAdmin
				.from("companies")
				.select("id,name,country,plan_id,subscription_status,subscription_ends_at")
				.eq("id", companyId)
				.maybeSingle(),
			// Todos los planes: el actual puede ser interno o estar inactivo.
			supabaseAdmin.from("plans").select(PLAN_COLUMNS),
			supabaseAdmin
				.from("company_plan_change_schedules")
				.select("id,target_plan_id,effective_at")
				.eq("company_id", companyId)
				.eq("status", "scheduled")
				.maybeSingle(),
			supabaseAdmin
				.from("company_addons")
				.select("status,expires_at,addon:addons(id,name,slug,type,description,price_monthly,price_one_time)")
				.eq("company_id", companyId)
				.eq("status", "active"),
			supabaseAdmin
				.from("company_branch_extra_entitlements")
				.select("quantity,unit_price")
				.eq("company_id", companyId)
				.eq("status", "active"),
			supabaseAdmin
				.from("payments_history")
				.select(PORTAL_ORDER_COLUMNS)
				.eq("company_id", companyId)
				.in("status", ["pending", "pending_validation", "rejected"])
				.order("payment_date", { ascending: false, nullsFirst: false })
				.limit(20),
		]);

	if (!company?.id) return null;
	const planRows = (plans ?? []) as BillingPlanRow[];

	const activeAddons: ActiveAddonRow[] = [];
	for (const row of (addons ?? []) as Array<{ expires_at: string | null; addon: unknown }>) {
		const addon = (Array.isArray(row.addon) ? row.addon[0] : row.addon) as
			| { id: string; name: string; slug: string | null; type: string | null; description: string | null; price_monthly: number | null; price_one_time: number | null }
			| null;
		if (!addon?.id) continue;
		activeAddons.push({
			addonId: addon.id,
			name: addon.name,
			slug: addon.slug,
			type: addon.type,
			description: addon.description,
			price_monthly: addon.price_monthly,
			price_one_time: addon.price_one_time,
			expires_at: row.expires_at,
		});
	}

	const byUnit = new Map<number, number>();
	for (const row of (entitlements ?? []) as Array<{ quantity: number | null; unit_price: number | null }>) {
		const quantity = Math.max(0, Number(row.quantity ?? 0) || 0);
		const unit = roundUsd(Number(row.unit_price ?? 0) || 0);
		if (quantity > 0) byUnit.set(unit, (byUnit.get(unit) ?? 0) + quantity);
	}

	const companyRow = company as PortalBillingContext["company"];
	return {
		company: companyRow,
		phase: resolveSubscriptionPhase(companyRow.subscription_status, companyRow.subscription_ends_at, now),
		plans: planRows,
		currentPlan: planRows.find((plan) => plan.id === companyRow.plan_id) ?? null,
		scheduledChange: (schedule as PortalBillingContext["scheduledChange"]) ?? null,
		activeAddons,
		branchExtras: [...byUnit.entries()].map(([unitPrice, quantity]) => ({ unitPrice, quantity })),
		openOrders: ((orders ?? []) as PortalOrderRow[]).filter(isOpenOrder),
	};
}

/** Plan que regirá al empezar el próximo periodo: el programado, si hay, o el actual. */
export function nextCyclePlan(ctx: PortalBillingContext): BillingPlanRow | null {
	const scheduled = ctx.scheduledChange ? ctx.plans.find((plan) => plan.id === ctx.scheduledChange?.target_plan_id) : null;
	return scheduled ?? ctx.currentPlan;
}

/** Plan que se puede contratar desde el portal (los internos no). */
export function findPublicPlan(ctx: PortalBillingContext, planId: string): BillingPlanRow | null {
	return ctx.plans.find((plan) => plan.id === planId && plan.is_active !== false && plan.is_public === true) ?? null;
}

/**
 * Lo que se renueva cada mes además del plan: extras mensuales activos (salvo los que el
 * plan ya incluye) y sucursales extra. Es exactamente lo que `activateCompanySubscription`
 * extiende al renovar.
 */
export function buildRecurringCharges(ctx: PortalBillingContext, plan: BillingPlanRow | null): RecurringCharge[] {
	const charges: RecurringCharge[] = [];
	for (const addon of ctx.activeAddons) {
		const { isMonthly, unitPrice } = resolveAddonUnitPrice(addon);
		if (!isMonthly || unitPrice <= 0) continue;
		const offer = resolveAddonOfferForPlan(plan, {
			id: addon.addonId,
			slug: addon.slug,
			name: addon.name,
			type: addon.type,
			description: addon.description,
		});
		if (offer.status === "included") continue;
		charges.push({ key: `addon:${addon.addonId}`, label: addon.name, unitMonthly: unitPrice, quantity: 1 });
	}
	for (const extra of ctx.branchExtras) {
		if (extra.unitPrice <= 0) continue;
		charges.push({
			key: `branches:${extra.unitPrice}`,
			label: extra.quantity === 1 ? "Sucursal extra" : "Sucursales extra",
			unitMonthly: extra.unitPrice,
			quantity: extra.quantity,
		});
	}
	return charges;
}

export function findOpenOrder(
	ctx: PortalBillingContext,
	matches: (kind: { kind: PortalPaymentKind; addonId?: string }) => boolean,
): PortalOrderRow | null {
	return (
		ctx.openOrders.find((order) => {
			const kind = classifyPortalPaymentReference(order.payment_reference);
			return kind != null && matches(kind);
		}) ?? null
	);
}

function buildReference(kind: PortalPaymentKind, addonId?: string): string {
	const suffix = randomUUID().slice(0, 8).toUpperCase();
	switch (kind) {
		case "plan_change":
			return `PLANCHG-${Date.now()}-${suffix}`;
		case "renewal":
			return `RENEW-${Date.now()}-${suffix}`;
		case "addon":
			return `ADDON-${addonId}-M1-${suffix}`;
		case "branch_expansion":
			return `CUST-${Date.now()}-${suffix}`;
	}
}

/** Violación de un CHECK: la base todavía no acepta el estado (falta la migración de estados). */
function isCheckViolation(error: { code?: string } | null | undefined): boolean {
	return error?.code === "23514";
}

export async function createPortalOrder(params: {
	companyId: string;
	planId: string;
	kind: PortalPaymentKind;
	amount: number;
	monthsPaid?: number;
	addonId?: string;
	now?: Date;
}): Promise<{ ok: true; order: PortalOrderRow } | { ok: false; error: string }> {
	const nowIso = (params.now ?? new Date()).toISOString();
	const row = {
		company_id: params.companyId,
		plan_id: params.planId,
		amount_paid: roundUsd(params.amount),
		// Meses que suma la renovación; en el resto se deja 1 (la columna no admite vacío).
		months_paid: Math.max(1, Math.floor(Number(params.monthsPaid ?? 1)) || 1),
		payment_reference: buildReference(params.kind, params.addonId),
		payment_method: null,
		payment_method_slug: null,
		// Fecha del pedido; al pagarse pasa a ser la fecha del pago.
		payment_date: nowIso,
	};

	const insert = (status: string) =>
		supabaseAdmin.from("payments_history").insert({ ...row, status }).select(PORTAL_ORDER_COLUMNS).single();

	let result = await insert("pending");
	if (isCheckViolation(result.error)) {
		// Sin la migración de estados: queda "en revisión" sin comprobante, que el portal
		// también sabe pagar (ver `isOrderAwaitingPayment`).
		result = await insert("pending_validation");
	}
	if (result.error || !result.data) {
		console.error("portal order insert:", result.error);
		return { ok: false, error: "No pudimos crear el pago. Intenta de nuevo en unos minutos." };
	}
	return { ok: true, order: result.data as PortalOrderRow };
}

async function findCompanyOrder(companyId: string, paymentId: string): Promise<PortalOrderRow | null> {
	const { data } = await supabaseAdmin
		.from("payments_history")
		.select(PORTAL_ORDER_COLUMNS)
		.eq("id", paymentId)
		.eq("company_id", companyId)
		.maybeSingle();
	return (data as PortalOrderRow | null) ?? null;
}

export type OrderMutationResult = { ok: true; order?: PortalOrderRow } | { ok: false; error: string; status: number };

/** El dueño anula un pedido que todavía no pagó. */
export async function cancelPortalOrder(companyId: string, paymentId: string, now = new Date()): Promise<OrderMutationResult> {
	const order = await findCompanyOrder(companyId, paymentId);
	if (!order || !classifyPortalPaymentReference(order.payment_reference)) {
		return { ok: false, error: "Pago no encontrado", status: 404 };
	}
	if (!isOrderAwaitingPayment(order)) {
		return {
			ok: false,
			error:
				order.status === "paid"
					? "Este pago ya se aplicó."
					: "Ya enviaste el comprobante y lo estamos revisando; escríbenos si quieres anularlo.",
			status: 409,
		};
	}

	const openStatuses = ["pending", "pending_validation", "rejected"];
	const { data: cancelled, error } = await supabaseAdmin
		.from("payments_history")
		.update({ status: "cancelled" })
		.eq("id", order.id)
		.in("status", openStatuses)
		.select("id")
		.maybeSingle();
	if (isCheckViolation(error)) {
		// Sin la migración de estados no existe "cancelled": un pedido sin pagar se borra
		// (la sucursal pendiente ligada se borra en cascada).
		const { error: deleteError } = await supabaseAdmin
			.from("payments_history")
			.delete()
			.eq("id", order.id)
			.in("status", openStatuses);
		if (deleteError) return { ok: false, error: "No pudimos anular el pago.", status: 500 };
	} else if (error || !cancelled) {
		return { ok: false, error: "Este pago cambió mientras tanto; recarga la página.", status: 409 };
	}

	await supabaseAdmin
		.from("company_branch_extra_entitlements")
		.update({ status: "cancelled", updated_at: now.toISOString() })
		.eq("payment_id", order.id)
		.eq("status", "pending");
	// La solicitud de sucursal ligada a este pago ya no hace falta.
	if (order.payment_reference) {
		await supabaseAdmin
			.from("saas_tickets")
			.update({ status: "closed", updated_at: now.toISOString() })
			.eq("company_id", companyId)
			.ilike("subject", `%${escapeLikePattern(order.payment_reference)}%`)
			.in("status", [...OPEN_TICKET_STATUSES]);
	}
	return { ok: true };
}

/** Comprobante de una transferencia (o similar): el pedido pasa a revisión del equipo. */
export async function submitPortalReceipt(params: {
	companyId: string;
	country: string | null;
	paymentId: string;
	methodSlug?: string | null;
	referenceFileUrl: string;
}): Promise<OrderMutationResult> {
	const order = await findCompanyOrder(params.companyId, params.paymentId);
	if (!order) return { ok: false, error: "Pago no encontrado", status: 404 };

	const status = String(order.status ?? "").toLowerCase();
	// En revisión se puede cambiar el comprobante; pagado o anulado, ya no.
	if (!isOrderAwaitingPayment(order) && status !== "pending_validation") {
		return { ok: false, error: "Este pago ya fue procesado.", status: 409 };
	}

	let method: { name: string; slug: string } | null = null;
	const slug = String(params.methodSlug ?? "").trim();
	if (slug) {
		const methods = await listPortalPaymentMethods(params.country);
		const found = methods.find((item) => item.slug === slug);
		if (!found) return { ok: false, error: "Ese método de pago no está disponible para tu país.", status: 400 };
		method = { name: found.name, slug: found.slug };
	} else if (!order.payment_method_slug) {
		return { ok: false, error: "Elige con qué método pagaste.", status: 400 };
	}

	const { data, error } = await supabaseAdmin
		.from("payments_history")
		.update({
			status: "pending_validation",
			reference_file_url: params.referenceFileUrl,
			...(method ? { payment_method: method.name, payment_method_slug: method.slug } : {}),
		})
		.eq("id", order.id)
		.in("status", ["pending", "pending_validation", "rejected"])
		.select(PORTAL_ORDER_COLUMNS)
		.maybeSingle();
	if (error || !data) return { ok: false, error: "No se pudo guardar el comprobante.", status: 500 };
	return { ok: true, order: data as PortalOrderRow };
}
