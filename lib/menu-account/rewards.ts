import "server-only";

import type {
	MenuAccountRedemption,
	MenuAccountRedemptionStatus,
	MenuAccountReward,
} from "@/components/tenant/account/menu-account-types";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";
import { resolveMenuImageUrl } from "@/lib/tenant/images/resolve-menu-image-url";

import { menuAccountErrors } from "./errors";
import type { MenuClientAccountRow } from "./types";

/** Canjes que se muestran en "Mis canjes"; los más viejos ya no aportan. */
const REDEMPTIONS_LIMIT = 30;

function toNumber(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Recompensas activas del negocio, como las arma el local en el panel (Cupones →
 * Recompensas por puntos). Las de producto traen nombre y foto para la tarjeta.
 */
export async function listMenuAccountRewards(account: MenuClientAccountRow): Promise<MenuAccountReward[]> {
	const { data, error } = await supabaseAdmin
		.from("loyalty_rewards")
		.select(
			"id, title, description, points_cost, kind, discount_type, discount_value, min_order_subtotal, valid_days, product:products(name, image_url)",
		)
		.eq("company_id", account.company_id)
		.eq("is_active", true)
		.order("points_cost", { ascending: true })
		.order("sort_order", { ascending: true });

	if (error) {
		logger.error("menu_account_rewards_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}

	return (data ?? []).map((row) => {
		const product = Array.isArray(row.product) ? row.product[0] : row.product;
		return {
			id: row.id,
			title: row.title,
			description: row.description,
			pointsCost: toNumber(row.points_cost),
			kind: row.kind === "product" ? "product" : "discount",
			discountType: row.discount_type === "percent" ? "percent" : "fixed_amount",
			discountValue: toNumber(row.discount_value),
			minOrderSubtotal: row.min_order_subtotal === null ? null : toNumber(row.min_order_subtotal),
			validDays: row.valid_days,
			productName: product?.name ?? null,
			// La base guarda la ruta en Storage; el menú la convierte igual.
			productImageUrl: resolveMenuImageUrl(product?.image_url),
		};
	});
}

function redemptionStatus(
	status: string,
	coupon: { redemptions_count: number; valid_until: string | null; is_active: boolean } | null,
	now: number,
): MenuAccountRedemptionStatus {
	if (status === "cancelled" || !coupon) return "cancelled";
	if (coupon.redemptions_count > 0) return "used";
	if (!coupon.is_active) return "cancelled";
	if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) return "expired";
	return "available";
}

/** Moneda del negocio, para mostrar los montos de las recompensas como en sus pedidos. */
export async function getMenuAccountCurrency(account: MenuClientAccountRow): Promise<string> {
	const { data } = await supabaseAdmin.from("companies").select("currency").eq("id", account.company_id).maybeSingle();
	return data?.currency?.trim() || "CLP";
}

/** Canjes de la cuenta con el estado de su cupón (disponible, usado o vencido). */
export async function listMenuAccountRedemptions(account: MenuClientAccountRow): Promise<MenuAccountRedemption[]> {
	const { data, error } = await supabaseAdmin
		.from("loyalty_redemptions")
		.select(
			"id, reward_title, points_cost, status, created_at, coupon:discount_coupons(code, valid_until, redemptions_count, is_active)",
		)
		.eq("account_id", account.id)
		.eq("company_id", account.company_id)
		.order("created_at", { ascending: false })
		.limit(REDEMPTIONS_LIMIT);

	if (error) {
		logger.error("menu_account_redemptions_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}

	const now = Date.now();
	return (data ?? []).map((row) => {
		const coupon = Array.isArray(row.coupon) ? row.coupon[0] : row.coupon;
		return {
			id: row.id,
			rewardTitle: row.reward_title,
			pointsCost: toNumber(row.points_cost),
			createdAt: row.created_at,
			couponCode: coupon?.code ?? null,
			validUntil: coupon?.valid_until ?? null,
			status: redemptionStatus(row.status, coupon ?? null, now),
		};
	});
}

/**
 * Canjea una recompensa. Todo pasa en `redeem_loyalty_reward`: bloquea la ficha,
 * revisa el saldo con la regla del panel, crea el cupón de un solo uso ligado a la
 * cuenta y registra el canje. El navegador solo dice qué recompensa quiere.
 */
export async function redeemMenuAccountReward(
	account: MenuClientAccountRow,
	rewardId: string,
): Promise<{ couponCode: string; validUntil: string | null; pointsLeft: number }> {
	const { data, error } = await supabaseAdmin.rpc("redeem_loyalty_reward", {
		p_account_id: account.id,
		p_reward_id: rewardId,
	});

	if (error) {
		if (error.message.includes("insufficient_points")) throw menuAccountErrors.insufficientPoints();
		if (error.message.includes("reward_unavailable")) throw menuAccountErrors.rewardUnavailable();
		logger.error("menu_account_redeem_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}

	const result = (data ?? {}) as { coupon_code?: unknown; valid_until?: unknown; points_left?: unknown };
	if (typeof result.coupon_code !== "string") {
		logger.error("menu_account_redeem_bad_result", {});
		throw menuAccountErrors.internal();
	}
	return {
		couponCode: result.coupon_code,
		validUntil: typeof result.valid_until === "string" ? result.valid_until : null,
		pointsLeft: Math.max(0, toNumber(result.points_left)),
	};
}
