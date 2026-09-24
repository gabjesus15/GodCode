import { normalizeCountryCode } from "@/lib/geo/country-registry";

/**
 * ¿Se ofrece el método de pago del SaaS en ese país? Un método sin países configurados
 * vale para todos. La lista guardada mezcla códigos ("CL") y nombres ("Chile"), así que
 * se compara con ambos. Misma regla en el onboarding y en /cuenta.
 */
export function isPaymentMethodAvailableForCountry(countries: string[] | null | undefined, country: string | null | undefined): boolean {
	const raw = country?.trim() || null;
	const normalized = normalizeCountryCode(raw);
	if (!normalized && !raw) return true;
	if (!Array.isArray(countries) || countries.length === 0) return true;
	const list = countries.map((value) => String(value).trim());
	return (normalized ? list.includes(normalized) : false) || (raw ? list.includes(raw) : false);
}
