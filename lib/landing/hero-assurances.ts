import { formatLandingPrice } from "./price";

/**
 * La línea de garantías bajo el botón del hero, igual en la home y en las páginas
 * de país: responde a las tres dudas de antes de pagar (si la sabré armar, cuánto
 * cuesta, si quedo amarrado). Un país puede añadir una promesa propia al final,
 * pero nunca quitar estas tres.
 */
export const HERO_ASSURANCE_FREE_UNTIL_PUBLISHED = "Gratis hasta que la publiques";
export const HERO_ASSURANCE_NO_LOCK_IN = "Sin permanencia";
/** La promo del primer pago, con su único nombre; las páginas de país la añaden al final. */
export const HERO_ASSURANCE_FIRST_PAYMENT_PROMO = "2 meses al precio de 1 en tu primer pago";

export type HeroFromPrice = { price: number; currency: string } | null;

/** «Desde $19 USD/mes», o nada si todavía no se conoce el plan más barato. */
export function heroPriceAssurance(fromPrice: HeroFromPrice): string | null {
	if (!fromPrice) return null;
	return `Desde ${formatLandingPrice(fromPrice.price, fromPrice.currency)} ${fromPrice.currency}/mes`;
}

/** Las garantías en orden: gratis, precio (si se conoce), sin permanencia y, al final, las propias de la página. */
export function buildHeroAssurances(fromPrice: HeroFromPrice, extra: readonly string[] = []): string[] {
	const price = heroPriceAssurance(fromPrice);
	return [HERO_ASSURANCE_FREE_UNTIL_PUBLISHED, ...(price ? [price] : []), HERO_ASSURANCE_NO_LOCK_IN, ...extra];
}
