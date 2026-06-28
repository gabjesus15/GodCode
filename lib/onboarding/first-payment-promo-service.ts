import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeEmail } from "./trial-eligibility";

export type FirstPaymentPromoEligibilityParams = {
	email: string | null | undefined;
	excludeCompanyId?: string | null;
};

/**
 * Determina si un email aún puede usar la promo "+1 mes gratis en tu primer pago".
 *
 * La promo se controla por email normalizado. Una vez que una empresa con ese
 * email tiene `first_payment_promo_used_at` no nulo, la promo ya no aplica.
 *
 * Empresas con plan `dev` u otras que nunca hayan pagado siguen siendo elegibles.
 */
export async function isFirstPaymentPromoEligible(
	supabaseAdmin: SupabaseClient,
	params: FirstPaymentPromoEligibilityParams,
): Promise<boolean> {
	const normalized = normalizeEmail(params.email);
	if (!normalized) return false;

	const { data: companyWithPromo } = await supabaseAdmin
		.from("companies")
		.select("id")
		.ilike("email", normalized)
		.not("first_payment_promo_used_at", "is", null)
		.maybeSingle();

	if (companyWithPromo?.id) {
		return false;
	}

	return true;
}
