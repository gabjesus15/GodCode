import { resolveMenuImageUrl } from "@/lib/tenant/images/resolve-menu-image-url";

export type EnhancementCatalogItem = {
	id: string;
	name: string;
	price: number;
	/** URL pública lista para renderizar, o `null` si no hay imagen utilizable. */
	image_url: string | null;
};

export type EnhancementCatalogs = {
	beverages: EnhancementCatalogItem[];
	globalExtras: EnhancementCatalogItem[];
};

export const EMPTY_ENHANCEMENT_CATALOGS: EnhancementCatalogs = {
	beverages: [],
	globalExtras: [],
};

function parseCatalogRows(raw: unknown, supabaseUrl?: string): EnhancementCatalogItem[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
		.map((row) => {
			const rawImage = row.image_url ?? row.imageUrl;
			return {
				id: String(row.id ?? ""),
				name: String(row.name ?? ""),
				price: Math.max(0, Math.round(Number(row.price) || 0)),
				// El panel guarda claves de Storage ("<company>/cart-upsell/.../x.png");
				// aquí se vuelven URL pública, igual que las fotos de producto del menú.
				image_url:
					typeof rawImage === "string" ? resolveMenuImageUrl(rawImage, supabaseUrl) : null,
			};
		})
		.filter((row) => row.id && row.name);
}

/**
 * Bebidas y extras globales que la sucursal ofrece en el carrito. Viven dentro de
 * `branches.delivery_settings` con dos nombres posibles por compatibilidad.
 */
export function parseEnhancementCatalogs(
	deliverySettings: unknown,
	supabaseUrl?: string,
): EnhancementCatalogs {
	if (
		!deliverySettings ||
		typeof deliverySettings !== "object" ||
		Array.isArray(deliverySettings)
	) {
		return EMPTY_ENHANCEMENT_CATALOGS;
	}
	const raw = deliverySettings as Record<string, unknown>;
	return {
		beverages: parseCatalogRows(raw.cartBeveragesCatalog ?? raw.beveragesCatalog, supabaseUrl),
		globalExtras: parseCatalogRows(
			raw.cartGlobalExtrasCatalog ?? raw.globalExtrasCatalog,
			supabaseUrl,
		),
	};
}
