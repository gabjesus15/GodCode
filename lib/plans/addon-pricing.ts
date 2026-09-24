/** Precio de un extra según su fila en `addons`. */
export type AddonPricingRow = {
	price_monthly: number | string | null;
	price_one_time: number | string | null;
};

/**
 * Un extra es mensual si tiene precio mensual; si no, se cobra una vez. Es la misma
 * regla en el onboarding, en /cuenta y al validar el pago (antes cada sitio usaba la suya:
 * `type === "monthly"` en uno, `price_monthly > 0` en otro).
 */
export function resolveAddonUnitPrice(addon: AddonPricingRow): { isMonthly: boolean; unitPrice: number } {
	const monthly = Number(addon.price_monthly ?? 0);
	if (Number.isFinite(monthly) && monthly > 0) return { isMonthly: true, unitPrice: monthly };
	const oneTime = Number(addon.price_one_time ?? 0);
	return { isMonthly: false, unitPrice: Number.isFinite(oneTime) && oneTime > 0 ? oneTime : 0 };
}

/** Extras que solo tienen sentido una vez por empresa (p. ej. dominio propio). */
export function isSingleInstanceAddon(addon: { name?: string | null; slug?: string | null; type?: string | null }): boolean {
	const haystack = `${addon.name ?? ""} ${addon.slug ?? ""} ${addon.type ?? ""}`.toLowerCase();
	return (
		haystack.includes("dominio") ||
		haystack.includes("domain") ||
		haystack.includes("custom_domain") ||
		haystack.includes("custom-domain")
	);
}
