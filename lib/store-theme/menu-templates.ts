import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import type { BusinessSector } from "@/lib/onboarding/business-sectors";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";

/**
 * Plantillas del menú público: un aspecto completo (colores, tarjetas, navegación,
 * tipografía) pensado para ciertos tipos de negocio. «Configura tu tienda» recomienda
 * las del negocio y el alta crea la tienda con la primera.
 *
 * Una plantilla nunca trae logo, nombre ni imagen de fondo: eso es del negocio.
 */
export type MenuTemplate = {
	id: string;
	name: string;
	description: string;
	/** Negocios para los que se recomienda. */
	sectors: BusinessSector[];
	theme: Partial<Omit<StoreThemeConfig, "logoUrl" | "displayName" | "backgroundImageUrl" | "templateId">>;
	previewImageUrl?: string;
};

export const MENU_TEMPLATES: MenuTemplate[] = [
	{
		id: "sushi-night",
		name: "Noche",
		description: "Fondo oscuro y acentos intensos. Las fotos de la comida resaltan.",
		sectors: ["Sushi", "Hamburguesas", "Comida rápida", "Pizzería"],
		theme: {
			primaryColor: "#eb3b00",
			secondaryColor: "#ff4f00",
			priceColor: "#ffffff",
			discountColor: "#25d366",
			hoverColor: "#ff6a2a",
			backgroundColor: "#111111",
			backgroundMode: "solid",
			surfaceScheme: "dark",
			navbarType: "category-tabs",
			navigationMode: "scroll",
			productCardStyle: "glass",
			productDetailsMode: "modal-premium",
			fontFamily: "bebas",
			brandNameColor: "",
		},
	},
	{
		id: "coffee-warm",
		name: "Café",
		description: "Tonos cálidos y letra suave, para cafeterías y pastelerías.",
		sectors: ["Cafetería", "Panadería y pastelería"],
		theme: {
			primaryColor: "#7c3f1d",
			secondaryColor: "#b1622c",
			priceColor: "#ffe8c2",
			discountColor: "#8ee381",
			hoverColor: "#9b5229",
			backgroundColor: "#2a1a12",
			backgroundMode: "solid",
			surfaceScheme: "dark",
			navbarType: "category-tabs",
			navigationMode: "scroll",
			productCardStyle: "layout-horizontal",
			productDetailsMode: "modal-premium",
			fontFamily: "lora",
			brandNameColor: "",
		},
	},
	{
		id: "fresh-market",
		name: "Fresco",
		description: "Claro y ordenado, se lee bien con cualquier carta.",
		sectors: ["Restaurante", "Otro"],
		theme: {
			primaryColor: "#0f766e",
			secondaryColor: "#14b8a6",
			priceColor: "#0f766e",
			discountColor: "#65a30d",
			hoverColor: "#0d9488",
			backgroundColor: "#f0f0f0",
			backgroundMode: "solid",
			surfaceScheme: "light",
			navbarType: "category-tabs",
			navigationMode: "scroll",
			productCardStyle: "layout-clean",
			productDetailsMode: "modal-premium",
			fontFamily: "poppins",
			brandNameColor: "",
		},
	},
];

export function findMenuTemplate(id: string | null | undefined): MenuTemplate | null {
	return MENU_TEMPLATES.find((template) => template.id === id) ?? null;
}

/** Las recomendadas para el negocio primero (la primera es la de por defecto) y después el resto. */
export function templatesForSector(sector: BusinessSector): MenuTemplate[] {
	const recommended = MENU_TEMPLATES.filter((template) => template.sectors.includes(sector));
	const others = MENU_TEMPLATES.filter((template) => !template.sectors.includes(sector));
	return [...recommended, ...others];
}

/** El tema con el aspecto de la plantilla; logo, nombre e imagen de fondo quedan como estaban. */
export function applyMenuTemplate(theme: StoreThemeConfig, templateId: string): StoreThemeConfig {
	const template = findMenuTemplate(templateId);
	if (!template) return theme;
	return normalizeStoreThemeConfig({
		...theme,
		...template.theme,
		logoUrl: theme.logoUrl,
		displayName: theme.displayName,
		backgroundImageUrl: theme.backgroundImageUrl,
		templateId: template.id,
	});
}
