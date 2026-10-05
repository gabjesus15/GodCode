import { NextRequest, NextResponse } from "next/server";

import { parseSubscriptionCouponPayload } from "@/lib/billing/subscription-coupon-admin";
import { SUBSCRIPTION_COUPON_COLUMNS } from "@/lib/billing/subscription-coupon-service";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";

/** @service-role super-admin
 *
 * Cupones del alta: lista (GET) y creación (POST). Ver `lib/billing/subscription-coupons`.
 */

export async function GET() {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const [couponsRes, plansRes] = await Promise.all([
		supabaseAdmin.from("subscription_coupons").select(SUBSCRIPTION_COUPON_COLUMNS).order("created_at", { ascending: false }).limit(500),
		supabaseAdmin.from("plans").select("id,name,is_public,is_active").order("price", { ascending: true }),
	]);

	if (couponsRes.error) {
		console.error("[subscription-coupons/list] DB error:", couponsRes.error.message);
		// Sin la tabla (migración pendiente) la página lo dice en vez de romperse.
		const missing = /subscription_coupons/.test(couponsRes.error.message) && /does not exist|schema cache/i.test(couponsRes.error.message);
		return NextResponse.json(
			{ error: missing ? "Falta aplicar la migración 20261006_subscription_coupons en la base." : "Error al cargar los cupones" },
			{ status: missing ? 503 : 500 },
		);
	}

	return NextResponse.json({ data: couponsRes.data ?? [], plans: plansRes.data ?? [] });
}

export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = await req.json().catch(() => ({}));
	const parsed = parseSubscriptionCouponPayload(body, { partial: false });
	if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

	const { data, error } = await supabaseAdmin
		.from("subscription_coupons")
		.insert({ ...parsed.data, created_by: permission.email ?? null })
		.select(SUBSCRIPTION_COUPON_COLUMNS)
		.single();

	if (error) {
		if (error.code === "23505") {
			return NextResponse.json({ error: `Ya existe un cupón con el código ${parsed.data.code}.` }, { status: 409 });
		}
		console.error("[subscription-coupons/create] DB error:", error.message);
		return NextResponse.json({ error: "No se pudo crear el cupón" }, { status: 500 });
	}

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "subscription_coupon.create",
		resourceType: "subscription_coupon",
		resourceId: data?.id ?? null,
		metadata: { code: parsed.data.code, kind: parsed.data.kind, value: parsed.data.value },
	});

	return NextResponse.json({ ok: true, data });
}
