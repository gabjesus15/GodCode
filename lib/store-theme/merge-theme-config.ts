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
