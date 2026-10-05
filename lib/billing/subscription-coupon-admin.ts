import {
	isValidCouponCode,
	normalizeCouponCode,
	SUBSCRIPTION_COUPON_KINDS,
	type SubscriptionCouponKind,
} from "./subscription-coupons";

/**
 * Lo que el super admin manda al crear o editar un cupón del alta, ya limpio y validado
 * con las mismas reglas que los `check` de la tabla (así el error llega en español y no
 * como un fallo de la base).
 */

export type SubscriptionCouponPayload = {
	code: string;
	description: string | null;
	kind: SubscriptionCouponKind;
	value: number;
	min_months: number;
	plan_ids: string[] | null;
	keeps_promo: boolean;
	max_redemptions: number | null;
	valid_from: string | null;
	valid_until: string | null;
	is_active: boolean;
};

export type ParsedCouponPayload =
	| { ok: true; data: Partial<SubscriptionCouponPayload> }
	| { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function has(body: Record<string, unknown>, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
}

function parseIsoDate(value: unknown, label: string): { ok: true; value: string | null } | { ok: false; error: string } {
	if (value == null || value === "") return { ok: true, value: null };
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return { ok: false, error: `La fecha «${label}» no es válida.` };
	return { ok: true, value: date.toISOString() };
}

function parseInteger(value: unknown): number | null {
	if (value == null || value === "") return null;
	const n = Number(value);
	return Number.isFinite(n) && Number.isInteger(n) ? n : NaN;
}

/**
 * `partial = true` (edición) acepta solo los campos presentes; en la creación son
 * obligatorios código, tipo y valor.
 */
export function parseSubscriptionCouponPayload(input: unknown, options: { partial: boolean }): ParsedCouponPayload {
	const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
	const data: Partial<SubscriptionCouponPayload> = {};
	const { partial } = options;

	if (has(body, "code") || !partial) {
		const code = normalizeCouponCode(body.code);
		if (!isValidCouponCode(code)) {
			return { ok: false, error: "El código debe tener de 4 a 32 caracteres: letras, números, guion o guion bajo." };
		}
		data.code = code;
	}

	if (has(body, "description")) {
		const description = String(body.description ?? "").trim();
		if (description.length > 200) return { ok: false, error: "La descripción no puede pasar de 200 caracteres." };
		data.description = description || null;
	}

	let kind: SubscriptionCouponKind | undefined;
	if (has(body, "kind") || !partial) {
		const raw = String(body.kind ?? "").trim();
		if (!SUBSCRIPTION_COUPON_KINDS.includes(raw as SubscriptionCouponKind)) {
			return { ok: false, error: "Elige el tipo de cupón: porcentaje, monto fijo o meses gratis." };
		}
		kind = raw as SubscriptionCouponKind;
		data.kind = kind;
	}

	if (has(body, "value") || !partial) {
		const value = Number(body.value);
		if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "El valor debe ser mayor que 0." };
		const effectiveKind = kind ?? (typeof body.current_kind === "string" ? (body.current_kind as SubscriptionCouponKind) : undefined);
		if (effectiveKind === "percent" && value > 100) return { ok: false, error: "Un porcentaje no puede pasar de 100." };
		if (effectiveKind === "free_months" && (!Number.isInteger(value) || value > 12)) {
			return { ok: false, error: "Los meses gratis van de 1 a 12, sin decimales." };
		}
		data.value = effectiveKind === "free_months" ? Math.trunc(value) : Math.round(value * 100) / 100;
	}

	if (has(body, "min_months")) {
		const months = parseInteger(body.min_months) ?? 1;
		if (Number.isNaN(months) || months < 1 || months > 12) return { ok: false, error: "El mínimo de meses va de 1 a 12." };
		data.min_months = months;
	}

	if (has(body, "plan_ids")) {
		const raw = body.plan_ids;
		if (raw == null) {
			data.plan_ids = null;
		} else if (Array.isArray(raw)) {
			const ids = [...new Set(raw.map((id) => String(id ?? "").trim()).filter(Boolean))];
			if (ids.some((id) => !UUID_PATTERN.test(id))) return { ok: false, error: "Hay un plan con id inválido." };
			data.plan_ids = ids.length > 0 ? ids : null;
		} else {
			return { ok: false, error: "Los planes deben venir como lista." };
		}
	}

	if (has(body, "keeps_promo")) data.keeps_promo = body.keeps_promo !== false;
	if (has(body, "is_active")) data.is_active = body.is_active !== false;

	if (has(body, "max_redemptions")) {
		const max = parseInteger(body.max_redemptions);
		if (max !== null && (Number.isNaN(max) || max < 1)) return { ok: false, error: "El límite de usos debe ser un entero mayor que 0, o quedar vacío." };
		data.max_redemptions = max;
	}

	if (has(body, "valid_from")) {
		const parsed = parseIsoDate(body.valid_from, "desde");
		if (!parsed.ok) return parsed;
		data.valid_from = parsed.value;
	}
	if (has(body, "valid_until")) {
		const parsed = parseIsoDate(body.valid_until, "hasta");
		if (!parsed.ok) return parsed;
		data.valid_until = parsed.value;
	}
	if (data.valid_from && data.valid_until && new Date(data.valid_until).getTime() <= new Date(data.valid_from).getTime()) {
		return { ok: false, error: "La fecha «hasta» debe ser posterior a «desde»." };
	}

	if (!partial) {
		data.description ??= null;
		data.min_months ??= 1;
		data.plan_ids ??= null;
		data.keeps_promo ??= true;
		data.max_redemptions ??= null;
		data.valid_from ??= null;
		data.valid_until ??= null;
		data.is_active ??= true;
	}

	if (partial && Object.keys(data).length === 0) return { ok: false, error: "No hay cambios que guardar." };
	return { ok: true, data };
}

/** Estado para la lista del super admin. */
export type CouponStatus = "active" | "inactive" | "scheduled" | "expired" | "exhausted";

export function resolveCouponStatus(
	coupon: { is_active: boolean; valid_from: string | null; valid_until: string | null; max_redemptions: number | null; redemptions_count: number },
	now: Date = new Date(),
): CouponStatus {
	if (!coupon.is_active) return "inactive";
	if (coupon.max_redemptions != null && coupon.redemptions_count >= coupon.max_redemptions) return "exhausted";
	const time = now.getTime();
	if (coupon.valid_until && time > new Date(coupon.valid_until).getTime()) return "expired";
	if (coupon.valid_from && time < new Date(coupon.valid_from).getTime()) return "scheduled";
	return "active";
}
