import { NextRequest, NextResponse } from "next/server";

import { createPortalOrder, findOpenOrder, loadPortalBillingContext, type PortalBillingContext } from "@/lib/billing/portal-billing";
import { quoteCoTermCharge, roundUsd } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isSingleInstanceAddon, resolveAddonUnitPrice } from "@/lib/plans/addon-pricing";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Contratar un extra desde /cuenta. Los mensuales vencen con la suscripción: hoy se paga
 * hasta el vencimiento y después entran en cada renovación. Los de pago único se pagan una
 * vez. Crea un pedido que se aplica al pagarse (`applyPortalPayment`).
 */

type AddonRow = {
	id: string;
	slug: string | null;
	name: string;
	type: string | null;
	description: string | null;
	price_one_time: number | null;
	price_monthly: number | null;
	is_active: boolean | null;
};

type Impact = { id: string; level: "block" | "info"; title: string; detail: string };

const MAX_ONE_TIME_QUANTITY = 10;

async function buildPreview(companyId: string, addonId: string, requestedQuantity: number) {
	const [billing, { data: addon }] = await Promise.all([
		loadPortalBillingContext(companyId),
		supabaseAdmin
			.from("addons")
			.select("id,slug,name,type,description,price_one_time,price_monthly,is_active")
			.eq("id", addonId)
			.maybeSingle(),
	]);
	if (!billing) return { error: "Empresa no encontrada", status: 404 } as const;
	const addonRow = addon as AddonRow | null;
	if (!addonRow?.id || addonRow.is_active === false) return { error: "Ese extra no está disponible.", status: 400 } as const;

	const { isMonthly, unitPrice } = resolveAddonUnitPrice(addonRow);
	const singleInstance = isSingleInstanceAddon(addonRow);
	// Los mensuales son uno por empresa (se renuevan con el plan); los de pago único admiten cantidad.
	const quantity = singleInstance || isMonthly ? 1 : Math.max(1, Math.min(MAX_ONE_TIME_QUANTITY, Math.floor(requestedQuantity) || 1));
	const owned = billing.activeAddons.some((row) => row.addonId === addonRow.id);
	const offer = resolveAddonOfferForPlan(billing.currentPlan, addonRow);

	const impacts: Impact[] = [];
	const block = (id: string, title: string, detail: string) => impacts.push({ id, level: "block", title, detail });

	if (billing.phase === "payment_pending") {
		block("phase", "Estamos validando tu primer pago", "Podrás contratar extras en cuanto tu cuenta quede activa.");
	} else if (billing.phase === "expired") {
		block("phase", "Tu suscripción venció", "Renueva tu plan para volver a contratar extras.");
	}
	if (offer.status === "included") block("included", "Ya viene incluido en tu plan", offer.reason);
	if (offer.status === "blocked") block("blocked", "No está disponible para tu plan", offer.reason);
	if (owned && (isMonthly || singleInstance)) {
		block(
			"owned",
			"Ya lo tienes activo",
			isMonthly ? "Los extras mensuales se renuevan solos junto con tu plan." : "Este extra se contrata una sola vez.",
		);
	}
	if (findOpenOrder(billing, (kind) => kind.kind === "addon" && kind.addonId === addonRow.id)) {
		block("open-order", "Ya tienes un pago pendiente para este extra", "Págalo o anúlalo en «Pagos pendientes».");
	}

	let amount = roundUsd(unitPrice * quantity);
	let coversUntil: string | null = null;
	let remainingDays: number | null = null;
	if (isMonthly) {
		const coTerm = quoteCoTermCharge({ unitMonthly: unitPrice, quantity, endsAt: billing.company.subscription_ends_at });
		if (coTerm) {
			amount = coTerm.amount;
			coversUntil = coTerm.coversUntil;
			remainingDays = coTerm.remainingDays;
		} else if (billing.phase === "open_ended") {
			block("no-cycle", "Tu cuenta no tiene fecha de vencimiento", "Los extras mensuales de esta cuenta los activa nuestro equipo. Escríbenos por Soporte.");
		}
	}

	return {
		preview: {
			addon: {
				id: addonRow.id,
				name: addonRow.name,
				description: addonRow.description,
				isMonthly,
				unitPrice,
				singleInstance,
			},
			owned,
			quantity,
			pricing: { amount, coversUntil, remainingDays },
			impacts,
		},
		billing,
	} as const;
}

export async function GET(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "addons_get", 40, 60_000);
	if (limited) return limited;

	const addonId = String(req.nextUrl.searchParams.get("addonId") ?? "").trim();
	if (!addonId) return NextResponse.json({ error: "Elige un extra." }, { status: 400 });
	const quantity = Number(req.nextUrl.searchParams.get("quantity") ?? 1);

	const result = await buildPreview(ctx.companyId, addonId, quantity);
	if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
	return NextResponse.json({ ok: true, preview: result.preview });
}

async function activateFreeAddon(billing: PortalBillingContext, addonId: string, isMonthly: boolean) {
	return supabaseAdmin.from("company_addons").upsert(
		{
			company_id: billing.company.id,
			addon_id: addonId,
			status: "active",
			price_paid: 0,
			expires_at: isMonthly ? billing.company.subscription_ends_at : null,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "company_id,addon_id" },
	);
}

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "addons_post", 10, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { addonId?: string; quantity?: number };
	const addonId = String(body.addonId ?? "").trim();
	if (!addonId) return NextResponse.json({ error: "Elige un extra." }, { status: 400 });

	const result = await buildPreview(ctx.companyId, addonId, Number(body.quantity ?? 1));
	if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
	const { preview, billing } = result;

	const block = preview.impacts.find((impact) => impact.level === "block");
	if (block) return NextResponse.json({ error: block.detail, impacts: preview.impacts }, { status: 409 });

	if (!(preview.pricing.amount > 0)) {
		const { error } = await activateFreeAddon(billing, preview.addon.id, preview.addon.isMonthly);
		if (error) return NextResponse.json({ error: "No se pudo activar el extra." }, { status: 500 });
		return NextResponse.json({ ok: true, applied: true, message: `${preview.addon.name} quedó activo.` });
	}

	if (!billing.company.plan_id) {
		return NextResponse.json({ error: "Tu cuenta no tiene plan asignado. Escríbenos para regularizarla." }, { status: 409 });
	}

	const created = await createPortalOrder({
		companyId: ctx.companyId,
		planId: billing.company.plan_id,
		kind: "addon",
		addonId: preview.addon.id,
		amount: preview.pricing.amount,
	});
	if (!created.ok) return NextResponse.json({ error: created.error }, { status: 500 });

	return NextResponse.json({ ok: true, order: created.order, message: `${preview.addon.name} se activa en cuanto se confirme el pago.` });
}
