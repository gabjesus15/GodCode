import { getCountryConfig } from "@/lib/geo/country-registry";
import { readThemeConfigObject } from "@/lib/store-theme/merge-theme-config";

const MAX_ADDRESS_CHARS = 56;

/** "rica-pizza" → "Rica Pizza": último recurso cuando el negocio no tiene nombre. */
export function formatBusinessNameFromSlug(slug: string): string {
	return slug
		.split("-")
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(" ");
}

/**
 * Nombre visible del negocio: el `displayName` del tema, si no el nombre de la
 * empresa, si no el slug formateado y al final `fallback`. Un nombre vacío o
 * con solo espacios cuenta como ausente (antes varios sitios usaban `??` y
 * publicaban un título vacío).
 */
export function resolveTenantDisplayName(
	company: { name?: string | null; theme_config?: unknown } | null | undefined,
	options: { slug?: string | null; fallback?: string } = {},
): string {
	const theme = readThemeConfigObject(company?.theme_config);
	const displayName = typeof theme.displayName === "string" ? theme.displayName.trim() : "";
	return (
		displayName ||
		company?.name?.trim() ||
		(options.slug ? formatBusinessNameFromSlug(options.slug) : "") ||
		options.fallback ||
		"Gcode"
	);
}

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
