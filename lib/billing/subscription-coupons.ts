import { resolveFirstPaymentPromo } from "@/lib/onboarding/first-payment-promo";

/**
 * Cupones del alta (la suscripción del SaaS). Lógica pura, sin base de datos, que
 * comparten la página de pago (vista previa), el checkout (importe real) y la
 * validación del equipo (meses a otorgar). Ver `migrations/20261006_subscription_coupons.sql`.
 *
 * - `percent` y `fixed` bajan el importe del primer pago.
 * - `free_months` suma meses de regalo a los pagados.
 * - `keeps_promo` dice si además sigue la promo pública «+1 mes gratis en tu primer pago».
 */

export type SubscriptionCouponKind = "percent" | "fixed" | "free_months";

export const SUBSCRIPTION_COUPON_KINDS: readonly SubscriptionCouponKind[] = ["percent", "fixed", "free_months"];

export type SubscriptionCouponRow = {
	id: string;
	code: string;
	description: string | null;
	kind: SubscriptionCouponKind;
	value: number;
	min_months: number;
	plan_ids: string[] | null;
	keeps_promo: boolean;
	max_redemptions: number | null;
	redemptions_count: number;
	valid_from: string | null;
	valid_until: string | null;
	is_active: boolean;
	created_by?: string | null;
	created_at?: string;
	updated_at?: string;
};

/** Lo que la página de pago necesita saber del cupón aplicado. */
export type AppliedCoupon = {
	id: string;
	code: string;
	kind: SubscriptionCouponKind;
	value: number;
	description: string | null;
	minMonths: number;
	keepsPromo: boolean;
};

/** Por qué un cupón no se puede usar (la página lo traduce). */
export type CouponProblem =
	| "invalid_format"
	| "not_found"
	| "inactive"
	| "not_started"
	| "expired"
	| "exhausted"
	| "plan_not_allowed"
	| "min_months"
	| "already_used"
	| "locked";

/** Mensajes en español para las respuestas de la API y el super admin. */
export const COUPON_PROBLEM_MESSAGES_ES: Record<CouponProblem, string> = {
	invalid_format: "Ese código no tiene el formato de un cupón.",
	not_found: "No encontramos ese cupón. Revisa que esté bien escrito.",
	inactive: "Ese cupón ya no está activo.",
	not_started: "Ese cupón todavía no está vigente.",
	expired: "Ese cupón ya venció.",
	exhausted: "Ese cupón ya alcanzó su límite de usos.",
	plan_not_allowed: "Ese cupón no vale para el plan que elegiste.",
	min_months: "Ese cupón exige pagar más meses.",
	already_used: "Ese cupón ya se usó con tu correo.",
	locked: "Tu pago ya está en revisión: no se puede cambiar el cupón.",
};

/** Mayúsculas, sin espacios, 4 a 32 caracteres: letras, números, guion y guion bajo. */
export const COUPON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{3,31}$/;

export function normalizeCouponCode(raw: unknown): string {
	return String(raw ?? "")
		.trim()
		.toUpperCase()
		.replace(/\s+/g, "");
}

export function isValidCouponCode(code: string): boolean {
	return COUPON_CODE_PATTERN.test(code);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código aleatorio sin caracteres que se confunden (0/O, 1/I). */
export function generateCouponCode(length = 8, random: () => number = Math.random): string {
	const size = Math.max(4, Math.min(32, Math.trunc(length)));
	let out = "";
	for (let index = 0; index < size; index += 1) {
		out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
	}
	return out;
}

export function round2(value: number): number {
	return Math.round((Number(value) || 0) * 100) / 100;
}

/** Vigencia y cupo: lo que no depende de quién lo usa ni de cuánto paga. */
export function checkCouponWindow(
	coupon: Pick<SubscriptionCouponRow, "is_active" | "valid_from" | "valid_until" | "max_redemptions" | "redemptions_count">,
	now: Date = new Date(),
): CouponProblem | null {
	if (!coupon.is_active) return "inactive";
	const time = now.getTime();
	if (coupon.valid_from && time < new Date(coupon.valid_from).getTime()) return "not_started";
	if (coupon.valid_until && time > new Date(coupon.valid_until).getTime()) return "expired";
	if (coupon.max_redemptions != null && Number(coupon.redemptions_count ?? 0) >= coupon.max_redemptions) return "exhausted";
	return null;
}

/** Plan elegido y meses pagados. `months` es opcional: la página lo revisa al aplicar y al cambiar los meses. */
export function checkCouponFit(
	coupon: Pick<SubscriptionCouponRow, "plan_ids" | "min_months">,
	params: { planId: string | null | undefined; months?: number | null },
): CouponProblem | null {
	const allowed = Array.isArray(coupon.plan_ids) ? coupon.plan_ids.map(String).filter(Boolean) : [];
	if (allowed.length > 0 && !allowed.includes(String(params.planId ?? ""))) return "plan_not_allowed";
	if (params.months != null && Number(params.months) < Number(coupon.min_months ?? 1)) return "min_months";
	return null;
}

export type CouponPricing = {
	/** Importe antes del cupón. */
	baseAmountUsd: number;
	discountUsd: number;
	/** Importe a cobrar (nunca negativo). */
	amountUsd: number;
	freeMonths: number;
};

/** Qué hace el cupón con un importe. Un `fixed` mayor que el total lo deja en 0 (alta gratis). */
export function computeCouponPricing(
	coupon: Pick<SubscriptionCouponRow, "kind" | "value"> | null | undefined,
	baseAmountUsd: number,
): CouponPricing {
	const base = Math.max(0, round2(baseAmountUsd));
	if (!coupon) return { baseAmountUsd: base, discountUsd: 0, amountUsd: base, freeMonths: 0 };
	const value = Math.max(0, Number(coupon.value) || 0);
	switch (coupon.kind) {
		case "percent": {
			const discount = Math.min(base, round2((base * Math.min(100, value)) / 100));
			return { baseAmountUsd: base, discountUsd: discount, amountUsd: round2(base - discount), freeMonths: 0 };
		}
		case "fixed": {
			const discount = Math.min(base, round2(value));
			return { baseAmountUsd: base, discountUsd: discount, amountUsd: round2(base - discount), freeMonths: 0 };
		}
		case "free_months":
			return { baseAmountUsd: base, discountUsd: 0, amountUsd: base, freeMonths: couponFreeMonths(coupon) };
		default:
			return { baseAmountUsd: base, discountUsd: 0, amountUsd: base, freeMonths: 0 };
	}
}

export function couponFreeMonths(coupon: Pick<SubscriptionCouponRow, "kind" | "value"> | null | undefined): number {
	if (!coupon || coupon.kind !== "free_months") return 0;
	return Math.max(0, Math.min(12, Math.trunc(Number(coupon.value) || 0)));
}

/** Lo que el cupón aporta a los meses otorgados; se guarda en la solicitud al iniciar el pago. */
export type CouponGrant = { keepsPromo: boolean; freeMonths: number };

export function couponGrantFromRow(coupon: Pick<SubscriptionCouponRow, "kind" | "value" | "keeps_promo"> | null | undefined): CouponGrant | null {
	if (!coupon) return null;
	return { keepsPromo: coupon.keeps_promo !== false, freeMonths: couponFreeMonths(coupon) };
}

export type OnboardingGrant = {
	chargedMonths: number;
	/** Meses que recibe: pagados + promo (si aplica) + regalo del cupón. */
	grantedMonths: number;
	promoApplied: boolean;
	couponFreeMonths: number;
};

/**
 * Meses a cobrar y a otorgar con promo y cupón. La promo «+1 mes» sigue valiendo salvo
 * que el cupón diga lo contrario (`keepsPromo = false`).
 */
export function resolveOnboardingGrant(params: {
	monthsPaid: number;
	promoEligible: boolean;
	coupon?: CouponGrant | null;
}): OnboardingGrant {
	const keepsPromo = params.coupon ? params.coupon.keepsPromo : true;
	const promo = resolveFirstPaymentPromo(params.monthsPaid, params.promoEligible && keepsPromo);
	const free = Math.max(0, Math.min(12, Math.trunc(Number(params.coupon?.freeMonths ?? 0) || 0)));
	return {
		chargedMonths: promo.chargedMonths,
		grantedMonths: promo.grantedMonths + free,
		promoApplied: promo.promoApplied,
		couponFreeMonths: free,
	};
}

export function toAppliedCoupon(row: SubscriptionCouponRow): AppliedCoupon {
	return {
		id: row.id,
		code: row.code,
		kind: row.kind,
		value: Number(row.value) || 0,
		description: row.description ?? null,
		minMonths: Math.max(1, Number(row.min_months) || 1),
		keepsPromo: row.keeps_promo !== false,
	};
}

/** «20 % de descuento», «$5,00 de descuento», «2 meses gratis» (para el equipo, en español). */
export function describeCouponValueEs(coupon: Pick<SubscriptionCouponRow, "kind" | "value">): string {
	const value = Number(coupon.value) || 0;
	switch (coupon.kind) {
		case "percent":
			return `${formatPercent(value)} de descuento`;
		case "fixed":
			return `${formatUsdShort(value)} de descuento`;
		case "free_months": {
			const months = couponFreeMonths(coupon);
			return `${months} ${months === 1 ? "mes" : "meses"} gratis`;
		}
		default:
			return "";
	}
}

export function formatPercent(value: number): string {
	const n = Number(value) || 0;
	return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, "")} %`;
}

export function formatUsdShort(value: number): string {
	const n = Number(value) || 0;
	return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}
