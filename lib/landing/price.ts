import type { PublicPlanForLanding } from "@/lib/plans/public-plans";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";

/**
 * Precio de plan para la landing. CLP se escribe como en Chile ($19.990);
 * el resto con el formato corto en inglés ($19), que es como se lee USD en la región.
 */
export function formatLandingPrice(price: number, currency: string): string {
	const locale = currency === "CLP" ? "es-CL" : "en-US";
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			currencyDisplay: "narrowSymbol",
			maximumFractionDigits: price % 1 === 0 ? 0 : 2,
		}).format(price);
	} catch {
		return `$${Math.round(price).toLocaleString(locale)}`;
	}
}

/** Plan pagado más barato en la moneda del país del visitante ("Desde $19 USD/mes"). */
export function resolveLowestPlanPrice(
	plans: PublicPlanForLanding[],
	country: string,
): { price: number; currency: string } | null {
	const prices = plans.map((plan) => resolveRegionalPlanPrice(plan, country)).filter((p) => p.price > 0);
	if (prices.length === 0) return null;
	return prices.reduce((min, current) => (current.price < min.price ? current : min));
}
