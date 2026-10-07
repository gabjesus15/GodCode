import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { applyMenuTemplate, findMenuTemplate } from "@/lib/store-theme/menu-templates";
import { brandButtonColors } from "@/lib/tenant/logo-colors";

/**
 * El color de la marca que eligió el dueño:
 * - `undefined`: todavía no eligió (el paso «Tu marca» le propone el del logo);
 * - `null`: prefiere los colores del diseño;
 * - un hex: los botones toman ese color, oscurecido hasta que el texto blanco se lea.
 */
export type BrandColorChoice = string | null | undefined;

/**
 * Si ya había un color de marca guardado (el botón no es el de su plantilla), se conserva
 * al cambiar de diseño; si no, queda sin elegir.
 */
export function initialBrandColor(theme: StoreThemeConfig): BrandColorChoice {
	const template = findMenuTemplate(theme.templateId);
	return template && template.theme.primaryColor !== theme.primaryColor ? theme.primaryColor : undefined;
}

/** Lo que se ve: el borrador con la plantilla elegida y el color de la marca encima. */
export function computeEffectiveTheme(input: {
	theme: StoreThemeConfig;
	displayName: string;
	pickedTemplateId: string | null;
	brandColor: BrandColorChoice;
}): StoreThemeConfig {
	const { theme, displayName, pickedTemplateId, brandColor } = input;
	let next: StoreThemeConfig = { ...theme, displayName: displayName.trim() || theme.displayName };
	if (pickedTemplateId) next = applyMenuTemplate(next, pickedTemplateId);
	if (brandColor) {
		const buttons = brandButtonColors(brandColor);
		if (buttons) next = { ...next, ...buttons };
	} else if (brandColor === null) {
		const template = findMenuTemplate(next.templateId);
		if (template?.theme.primaryColor) {
			next = { ...next, primaryColor: template.theme.primaryColor, hoverColor: template.theme.hoverColor ?? next.hoverColor };
		}
	}
	return next;
}
