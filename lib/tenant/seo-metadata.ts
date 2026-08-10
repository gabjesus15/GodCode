import { getCountryConfig } from "@/lib/geo/country-registry";

const MAX_ADDRESS_CHARS = 56;

function cleanLocationPart(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	return trimmed.replace(/\s+/g, " ");
}

/** Fragmento de ubicación usable en titles/descriptions (address corta o país). */
export function buildTenantLocationHint(
	address?: string | null,
	country?: string | null,
): string {
	const addr = cleanLocationPart(address);
	if (addr && addr.length <= MAX_ADDRESS_CHARS) return addr;

	const countryName = getCountryConfig(country)?.name;
	if (countryName) return countryName;

	if (addr) {
		const shortened = addr.slice(0, MAX_ADDRESS_CHARS).replace(/[,.\s]+$/, "");
		return shortened.length >= 12 ? `${shortened}…` : addr;
	}

	return "";
}

export function buildTenantMenuTitle(displayName: string): string {
	const name = displayName.trim() || "Menú";
	const suffix = " | Menú digital";
	const max = 60;
	if (`${name}${suffix}`.length <= max) return `${name}${suffix}`;
	const budget = max - suffix.length;
	if (budget < 12) return name.slice(0, max);
	return `${name.slice(0, budget).trimEnd()}${suffix}`;
}

export function buildTenantMenuDescription(opts: {
	displayName: string;
	address?: string | null;
	country?: string | null;
}): string {
	const name = opts.displayName.trim() || "este negocio";
	const location = buildTenantLocationHint(opts.address, opts.country);
	const where = location ? ` en ${location}` : "";
	return `Menú digital de ${name}${where}. Pide online con delivery o retiro.`;
}

export function buildTenantStorefrontDescription(opts: {
	displayName: string;
	address?: string | null;
	country?: string | null;
}): string {
	const name = opts.displayName.trim() || "este negocio";
	const location = buildTenantLocationHint(opts.address, opts.country);
	const where = location ? ` en ${location}` : "";
	return `Pide online en ${name}${where}. Consulta el menú digital, precios y haz tu pedido con delivery o retiro.`;
}
