/**
 * Shallow-merge for companies.theme_config JSONB.
 * Preserves keys outside the patch (layout, panelAccess, locale, etc.).
 */
export function asThemeConfigObject(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {};
	}
	return { ...(raw as Record<string, unknown>) };
}

/**
 * `theme_config` como objeto para leerlo: acepta el JSONB tal cual o guardado
 * como texto JSON (hay filas viejas así). Sustituye los parseos a mano que
 * estaban repetidos en layout, OG, manifest y favicon.
 */
export function readThemeConfigObject(raw: unknown): Record<string, unknown> {
	if (typeof raw === "string") {
		try {
			return asThemeConfigObject(JSON.parse(raw));
		} catch {
			return {};
		}
	}
	return asThemeConfigObject(raw);
}

export function mergeThemeConfig(
	base: unknown,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	return {
		...asThemeConfigObject(base),
		...patch,
	};
}

/** Keys that belong to the customer-account storefront theme (not panelAccess/locale). */
export const STORE_THEME_PATCH_KEYS = [
	"displayName",
	"primaryColor",
	"secondaryColor",
	"priceColor",
	"discountColor",
	"hoverColor",
	"backgroundColor",
	"backgroundBrightness",
	"backgroundImageUrl",
	"logoUrl",
	"navbarType",
	"navigationMode",
	"productCardStyle",
	"productDetailsMode",
	"surfaceScheme",
	"backgroundMode",
	"brandNameColor",
	"fontFamily",
] as const;

/**
 * Build a publish patch from the raw draft: only keys present on the draft object.
 * Avoids stamping DEFAULT_STORE_THEME onto published layout fields the draft never set.
 */
export function storeThemePatchFromRawDraft(
	rawDraft: unknown,
	normalized: Record<string, unknown>,
): Record<string, unknown> {
	const raw = asThemeConfigObject(rawDraft);
	const patch: Record<string, unknown> = {};
	for (const key of STORE_THEME_PATCH_KEYS) {
		if (Object.prototype.hasOwnProperty.call(raw, key) && raw[key] !== undefined) {
			patch[key] = normalized[key];
		}
	}
	return patch;
}
