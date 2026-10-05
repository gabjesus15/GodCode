import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";
import {
	checkCouponFit,
	checkCouponWindow,
	COUPON_PROBLEM_MESSAGES_ES,
	isValidCouponCode,
	normalizeCouponCode,
	type CouponProblem,
	type SubscriptionCouponRow,
} from "./subscription-coupons";

/**
 * Cupones del alta contra la base. Lo usan el servicio onboarding-billing (aplicar,
 * cotizar, cobrar) y el cierre del alta (canjear). Sin `server-only` a propósito: el
 * microservicio también lo importa.
 */

export const SUBSCRIPTION_COUPON_COLUMNS =
	"id,code,description,kind,value,min_months,plan_ids,keeps_promo,max_redemptions,redemptions_count,valid_from,valid_until,is_active,created_by,created_at,updated_at";

function asRow(data: unknown): SubscriptionCouponRow | null {
	if (!data || typeof data !== "object") return null;
	const row = data as SubscriptionCouponRow;
	return { ...row, value: Number(row.value) || 0, redemptions_count: Number(row.redemptions_count ?? 0) || 0 };
}

export async function findSubscriptionCouponByCode(
	supabaseAdmin: SupabaseClient,
	rawCode: unknown,
): Promise<SubscriptionCouponRow | null> {
	const code = normalizeCouponCode(rawCode);
	if (!isValidCouponCode(code)) return null;
	const { data } = await supabaseAdmin
		.from("subscription_coupons")
		.select(SUBSCRIPTION_COUPON_COLUMNS)
		.eq("code", code)
		.maybeSingle();
	return asRow(data);
}

export async function findSubscriptionCouponById(
	supabaseAdmin: SupabaseClient,
	id: string | null | undefined,
): Promise<SubscriptionCouponRow | null> {
	if (!id) return null;
	const { data } = await supabaseAdmin
		.from("subscription_coupons")
		.select(SUBSCRIPTION_COUPON_COLUMNS)
		.eq("id", id)
		.maybeSingle();
	return asRow(data);
}

/** Un correo canjea cada cupón una vez (índice único en la base; aquí se avisa antes de pagar). */
export async function hasEmailRedeemedCoupon(
	supabaseAdmin: SupabaseClient,
	couponId: string,
	email: string | null | undefined,
): Promise<boolean> {
	const normalized = normalizeEmail(email);
	if (!normalized) return false;
	const { data } = await supabaseAdmin
		.from("subscription_coupon_redemptions")
		.select("id")
		.eq("coupon_id", couponId)
		.eq("email_normalized", normalized)
		.limit(1)
		.maybeSingle();
	return Boolean(data);
}

export type CouponCheckFailure = { ok: false; problem: CouponProblem; message: string };
export type CouponCheck = { ok: true; coupon: SubscriptionCouponRow } | CouponCheckFailure;

export function couponProblem(problem: CouponProblem): CouponCheckFailure {
	return { ok: false, problem, message: COUPON_PROBLEM_MESSAGES_ES[problem] };
}

/**
 * ¿Puede esta solicitud usar este cupón ahora? Vigencia, cupo, plan, meses y que el
 * correo no lo haya canjeado ya. `months` se omite cuando aún no se sabe cuántos pagará.
 */
export async function checkCouponForApplication(
	supabaseAdmin: SupabaseClient,
	params: {
		coupon: SubscriptionCouponRow | null;
		email: string | null | undefined;
		planId: string | null | undefined;
		months?: number | null;
		now?: Date;
	},
): Promise<CouponCheck> {
	const { coupon } = params;
	if (!coupon) return couponProblem("not_found");
	const window = checkCouponWindow(coupon, params.now ?? new Date());
	if (window) return couponProblem(window);
	const fit = checkCouponFit(coupon, { planId: params.planId, months: params.months });
	if (fit) return couponProblem(fit);
	if (await hasEmailRedeemedCoupon(supabaseAdmin, coupon.id, params.email)) return couponProblem("already_used");
	return { ok: true, coupon };
}

/** Columnas del cupón en la solicitud (ver migración 20261006). */
export const APPLICATION_COUPON_COLUMNS = "coupon_id,coupon_code,coupon_discount_usd,coupon_free_months,coupon_keeps_promo";

export type ApplicationCouponFields = {
	coupon_id: string | null;
	coupon_code: string | null;
	coupon_discount_usd: number | null;
	coupon_free_months: number | null;
	coupon_keeps_promo: boolean | null;
};

/** Quita el cupón de la solicitud (y la foto del descuento, si la había). */
export async function clearApplicationCoupon(supabaseAdmin: SupabaseClient, applicationId: string): Promise<void> {
	await supabaseAdmin
		.from("onboarding_applications")
		.update({
			coupon_id: null,
			coupon_code: null,
			coupon_discount_usd: null,
			coupon_free_months: null,
			coupon_keeps_promo: null,
			updated_at: new Date().toISOString(),
		})
		.eq("id", applicationId);
}

/**
 * Registra el canje al cerrar el alta. Idempotente por (cupón, correo): devuelve `false`
 * si ya estaba canjeado o si la base falla; nunca lanza, porque el alta ya está cobrada.
 */
export async function redeemSubscriptionCoupon(
	supabaseAdmin: SupabaseClient,
	params: {
		couponId: string;
		email: string | null | undefined;
		applicationId?: string | null;
		companyId?: string | null;
		paymentReference?: string | null;
		baseAmountUsd?: number | null;
		discountUsd?: number | null;
		freeMonths?: number | null;
	},
): Promise<boolean> {
	try {
		const { data, error } = await supabaseAdmin.rpc("redeem_subscription_coupon", {
			p_coupon_id: params.couponId,
			p_email: normalizeEmail(params.email),
			p_application_id: params.applicationId ?? null,
			p_company_id: params.companyId ?? null,
			p_payment_reference: params.paymentReference ?? null,
			p_base_amount_usd: Number(params.baseAmountUsd ?? 0) || 0,
			p_discount_usd: Number(params.discountUsd ?? 0) || 0,
			p_free_months: Math.max(0, Math.trunc(Number(params.freeMonths ?? 0) || 0)),
		});
		if (error) {
			console.error("redeem_subscription_coupon:", error.message);
			return false;
		}
		return data === true;
	} catch (error) {
		console.error("redeem_subscription_coupon:", error);
		return false;
	}
}
