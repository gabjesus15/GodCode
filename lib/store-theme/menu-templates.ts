import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { asThemeConfigObject } from "@/lib/store-theme/merge-theme-config";
import {
	normalizeBrandNameColor,
	normalizeStoreThemeConfig,
	type ProductCardStyle,
	type StoreThemeFontId,
} from "@/lib/store-theme/theme-config";

/**
 * Plantillas del menú público: cada una es un look completo (tarjeta,
 * tipografía, colores, claro/oscuro y fondo) pensado para un tipo de negocio.
 *
 * Elegir una plantilla escribe sus campos en `companies.theme_config`, como si
 * el dueño los hubiera tocado uno a uno en «Tienda», y guarda además su id en
 * `theme_config.templateId` para saber de dónde salió el look. Después el
 * dueño puede seguir cambiando cualquier campo suelto.
 *
 * Los tipos de negocio son los del paso 2 del alta (`onboarding_applications.sector`),
 * guardados como texto en español: "Pizzería", "Sushi", "Hamburguesas",
 * "Comida rápida", "Restaurante", "Cafetería", "Panadería y pastelería" y "Otro".
 */

export const MENU_TEMPLATE_IDS = ["horno", "brasa", "combo", "nori", "mantel", "aroma", "hojaldre", "clasica"] as const;
export type MenuTemplateId = (typeof MENU_TEMPLATE_IDS)[number];

/** Clave en theme_config donde queda la plantilla elegida. */
export const MENU_TEMPLATE_THEME_KEY = "templateId";

/** Campos del tema que fija una plantilla. Logo, nombre e imagen de fondo son del local y no se tocan. */
export type MenuTemplateTheme = Required<
	Pick<
		StoreThemeConfig,
		| "primaryColor"
		| "secondaryColor"
		| "priceColor"
		| "discountColor"
		| "hoverColor"
		| "backgroundColor"
		| "navbarType"
		| "navigationMode"
		| "productCardStyle"
		| "productDetailsMode"
		| "surfaceScheme"
		| "backgroundMode"
		| "brandNameColor"
		| "fontFamily"
	>
> & { productCardStyle: ProductCardStyle; fontFamily: StoreThemeFontId };

export type MenuTemplate = {
	id: MenuTemplateId;
	name: string;
	/** Una línea para la tarjeta del selector. */
	description: string;
	/** Tipos de negocio para los que es la recomendada (el primero que coincida gana). */
	sectors: readonly string[];
	theme: MenuTemplateTheme;
	/** Captura del menú con la plantilla; si está, el asistente la muestra en vez de la miniatura dibujada. */
	previewImageUrl?: string;
};

const BASE = {
	navbarType: "category-tabs",
	navigationMode: "scroll",
	productDetailsMode: "modal-premium",
	backgroundMode: "solid",
	brandNameColor: "",
	discountColor: "#25d366",
} as const;

export const MENU_TEMPLATES: readonly MenuTemplate[] = [
	{
		id: "horno",
		name: "Horno",
		description: "Oscura y con letra de cartel. La foto de cada pizza llena la tarjeta.",
		sectors: ["Pizzería"],
		theme: {
			...BASE,
			productCardStyle: "layout-cartel",
			fontFamily: "anton",
			surfaceScheme: "dark",
			backgroundColor: "#111111",
			primaryColor: "#d62828",
			secondaryColor: "#f4a261",
			hoverColor: "#b71c1c",
			priceColor: "#ffffff",
		},
	},
	{
		id: "brasa",
		name: "Brasa",
		description: "Negra y naranja, con nombres grandes sobre la foto. Para hamburguesas y parrilla.",
		sectors: ["Hamburguesas"],
		theme: {
			...BASE,
			productCardStyle: "layout-cartel",
			fontFamily: "bebas",
			surfaceScheme: "dark",
			backgroundColor: "#141210",
			primaryColor: "#f97316",
			secondaryColor: "#facc15",
			hoverColor: "#ea580c",
			priceColor: "#ffffff",
		},
	},
	{
		id: "combo",
		name: "Combo",
		description: "Clara y alegre, con letra redonda. Para comida rápida, completos y snacks.",
		sectors: ["Comida rápida"],
		theme: {
			...BASE,
			productCardStyle: "layout-vitrina",
			fontFamily: "lilita",
			surfaceScheme: "light",
			backgroundColor: "#fff6e5",
			primaryColor: "#e11d2a",
			secondaryColor: "#f59e0b",
			hoverColor: "#c81e1e",
			priceColor: "#e11d2a",
		},
	},
	{
		id: "nori",
		name: "Nori",
		description: "Negra y sobria, la foto manda y el detalle va en naranja. Para sushi y cocina asiática.",
		sectors: ["Sushi"],
		theme: {
			...BASE,
			productCardStyle: "layout-nori",
			fontFamily: "poppins",
			surfaceScheme: "dark",
			backgroundColor: "#0d0d0d",
			primaryColor: "#f05a1a",
			secondaryColor: "#f05a1a",
			hoverColor: "#d94a0e",
			priceColor: "#ffffff",
		},
	},
	{
		id: "mantel",
		name: "Mantel",
		description: "Como una carta impresa: lista con foto al lado y letra con serifa. Para restaurantes.",
		sectors: ["Restaurante"],
		theme: {
			...BASE,
			productCardStyle: "layout-carta",
			fontFamily: "playfair",
			surfaceScheme: "light",
			backgroundColor: "#f3f1ec",
			primaryColor: "#1f6f4a",
			secondaryColor: "#b08d57",
			hoverColor: "#185a3c",
			priceColor: "#1f6f4a",
		},
	},
	{
		id: "aroma",
		name: "Aroma",
		description: "Crema y café, cálida y luminosa. Para cafeterías y desayunos.",
		sectors: ["Cafetería"],
		theme: {
			...BASE,
			productCardStyle: "layout-vitrina",
			fontFamily: "lora",
			surfaceScheme: "light",
			backgroundColor: "#f4ede4",
			primaryColor: "#7a4b2a",
			secondaryColor: "#c9a27e",
			hoverColor: "#653d22",
			priceColor: "#7a4b2a",
		},
	},
	{
		id: "hojaldre",
		name: "Hojaldre",
		description: "Rosa suave y letra elegante, como una vitrina de pastelería.",
		sectors: ["Panadería y pastelería"],
		theme: {
			...BASE,
			productCardStyle: "layout-vitrina",
			fontFamily: "playfair",
			surfaceScheme: "light",
			backgroundColor: "#fbf1ee",
			primaryColor: "#b83a62",
			secondaryColor: "#e8a87c",
			hoverColor: "#9c2f52",
			priceColor: "#b83a62",
		},
	},
	{
		id: "clasica",
		name: "Clásica",
		description: "Lista clara y ordenada que sirve para cualquier carta.",
		sectors: ["Otro"],
		theme: {
			...BASE,
			productCardStyle: "layout-carta",
			fontFamily: "montserrat",
			surfaceScheme: "light",
			backgroundColor: "#f0f0f0",
			primaryColor: "#e63946",
			secondaryColor: "#1d3557",
			hoverColor: "#c92f3b",
			priceColor: "#e63946",
		},
	},
];

export const DEFAULT_MENU_TEMPLATE_ID: MenuTemplateId = "clasica";

const BY_ID = new Map(MENU_TEMPLATES.map((template) => [template.id, template]));

export function isMenuTemplateId(value: unknown): value is MenuTemplateId {
	return typeof value === "string" && BY_ID.has(value as MenuTemplateId);
}

export function getMenuTemplate(id: unknown): MenuTemplate {
	return (isMenuTemplateId(id) ? BY_ID.get(id) : undefined) ?? (BY_ID.get(DEFAULT_MENU_TEMPLATE_ID) as MenuTemplate);
}

function normalizeSector(value: string): string {
	return value
		.trim()
		.toLocaleLowerCase("es")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "");
}

/** Plantilla recomendada para un tipo de negocio del alta. Desconocido o vacío → la de "Otro". */
export function recommendMenuTemplate(sector: string | null | undefined): MenuTemplateId {
	const wanted = normalizeSector(String(sector ?? ""));
	if (!wanted) return DEFAULT_MENU_TEMPLATE_ID;
	const match = MENU_TEMPLATES.find((template) => template.sectors.some((s) => normalizeSector(s) === wanted));
	return match?.id ?? DEFAULT_MENU_TEMPLATE_ID;
}

/**
 * Plantillas en el orden en que conviene ofrecerlas: la recomendada primero y
 * después las demás en su orden de siempre.
 */
export function orderMenuTemplatesForSector(sector: string | null | undefined): MenuTemplate[] {
	const recommended = recommendMenuTemplate(sector);
	return [getMenuTemplate(recommended), ...MENU_TEMPLATES.filter((template) => template.id !== recommended)];
}

/** Lo mismo que `orderMenuTemplatesForSector` (nombre que usa el alta). */
export const templatesForSector = orderMenuTemplatesForSector;

/** Plantilla por id, o null si el id no existe (sin caer en la de por defecto). */
export function findMenuTemplate(id: unknown): MenuTemplate | null {
	return isMenuTemplateId(id) ? (BY_ID.get(id) ?? null) : null;
}

type MenuTemplatePatch = MenuTemplateTheme & { templateId: MenuTemplateId };

/**
 * Campos que hay que escribir en theme_config para aplicar la plantilla.
 *
 * `accentColor`: color de marca que ya tiene el local (por ejemplo, sacado del
 * logo). Si es un hex válido sustituye al acento de la plantilla, para que
 * elegir un diseño no le cambie el color de su marca.
 */
export function menuTemplatePatch(id: MenuTemplateId, options: { accentColor?: string | null } = {}): MenuTemplatePatch {
	const template = getMenuTemplate(id);
	const theme: MenuTemplateTheme = { ...template.theme };
	const accent = normalizeBrandNameColor(options.accentColor ?? "");
	if (accent && accent !== "hover") {
		theme.primaryColor = accent;
		theme.hoverColor = accent;
		if (template.theme.priceColor === template.theme.primaryColor) theme.priceColor = accent;
	}
	return { ...theme, [MENU_TEMPLATE_THEME_KEY]: template.id } as MenuTemplatePatch;
}

/**
 * El tema entero con el aspecto de la plantilla; logo, nombre e imagen de
 * fondo quedan como estaban. Con un id que no existe devuelve el mismo tema.
 */
export function applyMenuTemplate(theme: StoreThemeConfig, templateId: string): StoreThemeConfig {
	const template = findMenuTemplate(templateId);
	if (!template) return theme;
	return normalizeStoreThemeConfig({
		...theme,
		...menuTemplatePatch(template.id),
		logoUrl: theme.logoUrl,
		displayName: theme.displayName,
		backgroundImageUrl: theme.backgroundImageUrl,
	});
}

/** Plantilla guardada en theme_config, o null si el local nunca eligió una. */
export function readMenuTemplateId(themeConfig: unknown): MenuTemplateId | null {
	const value = asThemeConfigObject(themeConfig)[MENU_TEMPLATE_THEME_KEY];
	return isMenuTemplateId(value) ? value : null;
}
