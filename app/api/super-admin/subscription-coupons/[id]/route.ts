import { NextRequest, NextResponse } from "next/server";

import { parseSubscriptionCouponPayload } from "@/lib/billing/subscription-coupon-admin";
import { SUBSCRIPTION_COUPON_COLUMNS } from "@/lib/billing/subscription-coupon-service";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

/** @service-role super-admin
 *
 * Un cupón del alta: detalle con sus canjes (GET), edición (PATCH) y borrado (DELETE, solo
 * sin canjes: con usos se desactiva, para no perder el historial).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readId(params: Promise<{ id: string }>): Promise<string | null> {
	const raw = (await params).id;
	const id = typeof raw === "string" ? raw.trim() : "";
	return UUID_PATTERN.test(id) ? id : null;
}

type RedemptionRow = {
	id: string;
	application_id: string | null;
	company_id: string | null;
	email_normalized: string;
	payment_reference: string | null;
	base_amount_usd: number;
	discount_usd: number;
	free_months: number;
	redeemed_at: string;
	onboarding_applications: { business_name: string | null } | { business_name: string | null }[] | null;
	companies: { name: string | null } | { name: string | null }[] | null;
};

function first<T>(value: T | T[] | null): T | null {
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}
	const id = await readId(params);
	if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

	const [couponRes, redemptionsRes] = await Promise.all([
		supabaseAdmin.from("subscription_coupons").select(SUBSCRIPTION_COUPON_COLUMNS).eq("id", id).maybeSingle(),
		supabaseAdmin
			.from("subscription_coupon_redemptions")
			.select(
				"id,application_id,company_id,email_normalized,payment_reference,base_amount_usd,discount_usd,free_months,redeemed_at,onboarding_applications(business_name),companies(name)",
			)
			.eq("coupon_id", id)
			.order("redeemed_at", { ascending: false })
			.limit(500),
	]);

	if (couponRes.error || redemptionsRes.error) {
		console.error("[subscription-coupons/detail] DB error:", couponRes.error?.message ?? redemptionsRes.error?.message);
		return NextResponse.json({ error: "Error al cargar el cupón" }, { status: 500 });
	}
	if (!couponRes.data) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });

	const redemptions = ((redemptionsRes.data ?? []) as unknown as RedemptionRow[]).map((row) => ({
		id: row.id,
		applicationId: row.application_id,
		companyId: row.company_id,
		email: row.email_normalized,
		businessName: first(row.companies)?.name ?? first(row.onboarding_applications)?.business_name ?? null,
		paymentReference: row.payment_reference,
		baseAmountUsd: Number(row.base_amount_usd ?? 0) || 0,
		discountUsd: Number(row.discount_usd ?? 0) || 0,
		freeMonths: Number(row.free_months ?? 0) || 0,
		redeemedAt: row.redeemed_at,
	}));

	return NextResponse.json({ data: couponRes.data, redemptions });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}
	const id = await readId(params);
	if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

	const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
	// Para validar el valor contra el tipo cuando solo cambia uno de los dos.
	const { data: current } = await supabaseAdmin.from("subscription_coupons").select("id,kind,value,code").eq("id", id).maybeSingle();
	if (!current) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });

	const parsed = parseSubscriptionCouponPayload(
		{ ...body, current_kind: current.kind, ...(body.kind !== undefined && body.value === undefined ? { value: current.value } : {}) },
		{ partial: true },
	);
	if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

	const { data, error } = await supabaseAdmin
		.from("subscription_coupons")
		.update(parsed.data)
		.eq("id", id)
		.select(SUBSCRIPTION_COUPON_COLUMNS)
		.single();

	if (error) {
		if (error.code === "23505") {
			return NextResponse.json({ error: `Ya existe un cupón con el código ${parsed.data.code}.` }, { status: 409 });
		}
		console.error("[subscription-coupons/update] DB error:", error.message);
		return NextResponse.json({ error: "No se pudo guardar el cupón" }, { status: 500 });
	}

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "subscription_coupon.update",
		resourceType: "subscription_coupon",
		resourceId: id,
		metadata: { code: current.code, changes: Object.keys(parsed.data) },
	});

	return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}
	const id = await readId(params);
	if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

	const { data: current } = await supabaseAdmin
		.from("subscription_coupons")
		.select("id,code,redemptions_count")
		.eq("id", id)
		.maybeSingle();
	if (!current) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });
	if (Number(current.redemptions_count ?? 0) > 0) {
		return NextResponse.json(
			{ error: "Este cupón ya tiene canjes. Desactívalo en lugar de borrarlo, para no perder el historial." },
			{ status: 409 },
		);
	}

	// Una solicitud en curso puede tenerlo aplicado: se le quita antes de borrar.
	await supabaseAdmin
		.from("onboarding_applications")
		.update({ coupon_id: null, coupon_code: null, coupon_discount_usd: null, coupon_free_months: null, coupon_keeps_promo: null })
		.eq("coupon_id", id)
		.neq("payment_status", "paid");

	const { error } = await supabaseAdmin.from("subscription_coupons").delete().eq("id", id);
	if (error) {
		console.error("[subscription-coupons/delete] DB error:", error.message);
		return NextResponse.json({ error: "No se pudo borrar el cupón" }, { status: 500 });
	}

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "subscription_coupon.delete",
		resourceType: "subscription_coupon",
		resourceId: id,
		metadata: { code: current.code },
	});

	return NextResponse.json({ ok: true });
}
