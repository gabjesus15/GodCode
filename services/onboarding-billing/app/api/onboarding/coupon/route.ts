import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	checkCouponForApplication,
	clearApplicationCoupon,
	couponProblem,
	findSubscriptionCouponByCode,
} from "@/lib/billing/subscription-coupon-service";
import { COUPON_PROBLEM_MESSAGES_ES, isValidCouponCode, normalizeCouponCode, toAppliedCoupon } from "@/lib/billing/subscription-coupons";

/** @service-role capability-token
 *
 * Aplicar (POST) o quitar (DELETE) un cupón del alta en la solicitud. Solo se guarda qué
 * cupón eligió la persona: el descuento real lo calcula el checkout con los meses que pague,
 * y vuelve a comprobar el cupón en ese momento. El token de la solicitud es la credencial.
 */

type ApplicationRow = {
	id: string;
	email: string;
	plan_id: string | null;
	status: string;
	payment_status: string | null;
	payment_reference_url: string | null;
	coupon_id: string | null;
};

async function loadApplication(token: string): Promise<ApplicationRow | null> {
	const { data } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,plan_id,status,payment_status,payment_reference_url,coupon_id")
		.eq("verification_token", token)
		.in("status", ["form_completed", "payment_pending"])
		.maybeSingle();
	return (data as ApplicationRow | null) ?? null;
}

/** Con el pago cobrado o un comprobante en revisión el importe ya no puede cambiar. */
function isLocked(app: ApplicationRow): boolean {
	if (app.payment_status === "paid") return true;
	return app.payment_status === "pending_validation" && Boolean(app.payment_reference_url);
}

function readToken(value: unknown): string {
	const token = typeof value === "string" ? value.trim() : "";
	return token.length > 0 && token.length <= 100 ? token : "";
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { token?: unknown; code?: unknown; months?: unknown };
		const token = readToken(body.token);
		if (!token) {
			return NextResponse.json({ error: "Falta el enlace de tu solicitud. Vuelve a abrirlo desde el correo." }, { status: 400 });
		}
		const code = normalizeCouponCode(body.code);
		if (!isValidCouponCode(code)) {
			return NextResponse.json({ error: COUPON_PROBLEM_MESSAGES_ES.invalid_format, problem: "invalid_format" }, { status: 400 });
		}
		const monthsRaw = Number(body.months);
		const months = Number.isFinite(monthsRaw) && monthsRaw > 0 ? Math.min(12, Math.max(1, Math.trunc(monthsRaw))) : null;

		const app = await loadApplication(token);
		if (!app) return NextResponse.json({ error: "Solicitud no encontrada o incompleta" }, { status: 404 });
		if (isLocked(app)) {
			const locked = couponProblem("locked");
			return NextResponse.json({ error: locked.message, problem: locked.problem }, { status: 409 });
		}

		const coupon = await findSubscriptionCouponByCode(supabaseAdmin, code);
		const check = await checkCouponForApplication(supabaseAdmin, { coupon, email: app.email, planId: app.plan_id, months });
		if (!check.ok) {
			return NextResponse.json({ error: check.message, problem: check.problem }, { status: check.problem === "not_found" ? 404 : 409 });
		}

		const { error } = await supabaseAdmin
			.from("onboarding_applications")
			.update({
				coupon_id: check.coupon.id,
				coupon_code: check.coupon.code,
				// La foto del descuento se toma al iniciar el pago, con los meses definitivos.
				coupon_discount_usd: null,
				coupon_free_months: null,
				coupon_keeps_promo: null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", app.id);
		if (error) {
			console.error("onboarding coupon apply:", error.message);
			return NextResponse.json({ error: "No pudimos guardar el cupón. Intenta de nuevo." }, { status: 500 });
		}

		return NextResponse.json({ ok: true, coupon: toAppliedCoupon(check.coupon) });
	} catch (err) {
		console.error("onboarding coupon error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { token?: unknown };
		const token = readToken(body.token) || readToken(req.nextUrl.searchParams.get("token"));
		if (!token) {
			return NextResponse.json({ error: "Falta el enlace de tu solicitud. Vuelve a abrirlo desde el correo." }, { status: 400 });
		}
		const app = await loadApplication(token);
		if (!app) return NextResponse.json({ error: "Solicitud no encontrada o incompleta" }, { status: 404 });
		if (isLocked(app)) {
			const locked = couponProblem("locked");
			return NextResponse.json({ error: locked.message, problem: locked.problem }, { status: 409 });
		}
		if (app.coupon_id) await clearApplicationCoupon(supabaseAdmin, app.id);
		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error("onboarding coupon remove error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}
