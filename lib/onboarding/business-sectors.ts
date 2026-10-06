/**
 * Tipos de negocio del alta (paso 2, campo `sector` de `onboarding_applications`).
 * El valor guardado es el texto en español: lo lee el equipo en los avisos.
 *
 * De aquí salen el menú de ejemplo, la plantilla de menú recomendada y el flujo
 * guiado de /cuenta, así que todos hablan de los mismos negocios.
 */

export type BusinessSectorLocale = "es" | "en" | "pt" | "fr" | "de" | "it";

export const BUSINESS_SECTOR_OPTIONS = [
	{ value: "Pizzería", label: { es: "Pizzería", en: "Pizzeria", pt: "Pizzaria", fr: "Pizzeria", de: "Pizzeria", it: "Pizzeria" } },
	{ value: "Sushi", label: { es: "Sushi", en: "Sushi", pt: "Sushi", fr: "Sushi", de: "Sushi", it: "Sushi" } },
	{ value: "Hamburguesas", label: { es: "Hamburguesas", en: "Burgers", pt: "Hambúrgueres", fr: "Burgers", de: "Burger", it: "Hamburger" } },
	{ value: "Comida rápida", label: { es: "Comida rápida", en: "Fast food", pt: "Fast food", fr: "Restauration rapide", de: "Fast Food", it: "Fast food" } },
	{ value: "Restaurante", label: { es: "Restaurante", en: "Restaurant", pt: "Restaurante", fr: "Restaurant", de: "Restaurant", it: "Ristorante" } },
	{ value: "Cafetería", label: { es: "Cafetería", en: "Café", pt: "Cafeteria", fr: "Café", de: "Café", it: "Caffetteria" } },
	{ value: "Panadería y pastelería", label: { es: "Panadería y pastelería", en: "Bakery", pt: "Padaria e confeitaria", fr: "Boulangerie-pâtisserie", de: "Bäckerei", it: "Panetteria e pasticceria" } },
	{ value: "Otro", label: { es: "Otro", en: "Other", pt: "Outro", fr: "Autre", de: "Andere", it: "Altro" } },
] as const satisfies ReadonlyArray<{ value: string; label: Record<BusinessSectorLocale, string> }>;

export type BusinessSector = (typeof BUSINESS_SECTOR_OPTIONS)[number]["value"];

export const BUSINESS_SECTORS: readonly BusinessSector[] = BUSINESS_SECTOR_OPTIONS.map((option) => option.value);

/** Lee el `sector` guardado sin importar mayúsculas; lo que no reconoce cae en «Otro». */
export function resolveBusinessSector(raw: string | null | undefined): BusinessSector {
	const value = String(raw ?? "").trim().toLocaleLowerCase("es");
	return BUSINESS_SECTORS.find((sector) => sector.toLocaleLowerCase("es") === value) ?? "Otro";
}
