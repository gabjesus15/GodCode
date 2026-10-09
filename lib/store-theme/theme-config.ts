import { DEFAULT_STORE_THEME } from "@/components/customer-portal/shared/customer-account-store-theme-constants";
import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { asThemeConfigObject, STORE_THEME_PATCH_KEYS } from "@/lib/store-theme/merge-theme-config";

export const NAVBAR_TYPES = [
  "category-tabs",
  "underline-tabs",
  "sidebar-categories",
  "mega-menu",
  "icon-list",
  "floating-bottom",
] as const;

export type NavbarType = (typeof NAVBAR_TYPES)[number];

export const NAVIGATION_MODES = ["scroll", "pagination"] as const;
export type NavigationMode = (typeof NAVIGATION_MODES)[number];

export const PRODUCT_DETAILS_MODES = ["modal-premium", "inline"] as const;
export type ProductDetailsMode = (typeof PRODUCT_DETAILS_MODES)[number];

/**
 * Piezas del menú que el dueño elige una a una en «Tienda», además de
 * categorías (navbarType), tarjeta (productCardStyle) y detalle
 * (productDetailsMode):
 * - headerStyle: "bar" solo la barra de arriba; "cover" suma una portada con
 *   foto, logo grande, estado abierto/cerrado y sucursal.
 * - featuredStyle: cómo van los destacados ("Solo hoy"): "section" como una
 *   categoría más; "carousel" en una fila que se desliza.
 * - cartStyle: "float" botón redondo; "bar" barra abajo con el total, solo
 *   cuando hay algo en el pedido.
 */
const HEADER_STYLES = ["bar", "cover"] as const;
export type HeaderStyle = (typeof HEADER_STYLES)[number];

const FEATURED_STYLES = ["section", "carousel"] as const;
export type FeaturedStyle = (typeof FEATURED_STYLES)[number];

const CART_STYLES = ["float", "bar"] as const;
export type CartStyle = (typeof CART_STYLES)[number];

export type MenuLayoutConfig = {
  headerStyle: HeaderStyle;
  featuredStyle: FeaturedStyle;
  cartStyle: CartStyle;
  /** Foto de la portada: la imagen de fondo del tema, si la hay. */
  coverImageUrl: string;
};

function pickOption<T extends string>(options: readonly T[], value: unknown): T {
  const raw = String(value ?? "").trim();
  return (options as readonly string[]).includes(raw) ? (raw as T) : options[0];
}

export function normalizeHeaderStyle(value: unknown): HeaderStyle {
  return pickOption(HEADER_STYLES, value);
}

export function normalizeFeaturedStyle(value: unknown): FeaturedStyle {
  return pickOption(FEATURED_STYLES, value);
}

export function normalizeCartStyle(value: unknown): CartStyle {
  return pickOption(CART_STYLES, value);
}

/** Las tres piezas sueltas del tema, normalizadas (lo que no venga, por defecto). */
export function normalizeMenuLayout(input: unknown): MenuLayoutConfig {
  const value = (input ?? {}) as Record<string, unknown>;
  return {
    headerStyle: normalizeHeaderStyle(value.headerStyle),
    featuredStyle: normalizeFeaturedStyle(value.featuredStyle),
    cartStyle: normalizeCartStyle(value.cartStyle),
    coverImageUrl: String(value.coverImageUrl ?? value.backgroundImageUrl ?? "").trim(),
  };
}

/** "auto" decide por la luminancia del color de fondo (ver lib/tenant/theme/surface-scheme). */
const SURFACE_SCHEMES = ["auto", "light", "dark"] as const;
export type SurfaceSchemeSetting = (typeof SURFACE_SCHEMES)[number];

/**
 * Tipografías del nombre del local. Cada una se autoaloja con `next/font` en
 * app/layout.tsx y expone su variable; el menú solo cambia `--tenant-font` y
 * `--tenant-font-weight`.
 *
 * `weight` es el peso con el que se pinta el nombre. Las de texto llevan la
 * negrita de siempre; las de cartel (Anton, Bebas Neue, Luckiest Guy, Lilita
 * One) solo existen en un peso y con 700 el navegador les inventaría una
 * negrita falsa que las deforma.
 */
export const STORE_THEME_FONTS = [
  { id: "montserrat", label: "Montserrat", cssVar: "--font-montserrat", generic: "sans-serif", weight: "700", description: "Geométrica y moderna. La de siempre." },
  { id: "inter", label: "Inter", cssVar: "--font-inter", generic: "sans-serif", weight: "700", description: "Neutra y muy legible en pantalla." },
  { id: "poppins", label: "Poppins", cssVar: "--font-poppins", generic: "sans-serif", weight: "700", description: "Redonda y amable, con carácter." },
  { id: "nunito", label: "Nunito", cssVar: "--font-nunito", generic: "sans-serif", weight: "700", description: "Suave y cercana, ideal para cafeterías." },
  { id: "playfair", label: "Playfair Display", cssVar: "--font-playfair", generic: "serif", weight: "700", description: "Elegante, para restaurantes de mantel." },
  { id: "lora", label: "Lora", cssVar: "--font-lora", generic: "serif", weight: "700", description: "Serif cálida y fácil de leer." },
  { id: "anton", label: "Anton", cssVar: "--font-anton", generic: "sans-serif", weight: "400", description: "Condensada y contundente, de cartel de pizzería." },
  { id: "bebas", label: "Bebas Neue", cssVar: "--font-bebas", generic: "sans-serif", weight: "400", description: "Mayúsculas altas y estrechas, muy de rótulo." },
  { id: "luckiest", label: "Luckiest Guy", cssVar: "--font-luckiest", generic: "cursive", weight: "400", description: "Rotulada y divertida, como pintada a mano." },
  { id: "lilita", label: "Lilita One", cssVar: "--font-lilita", generic: "sans-serif", weight: "400", description: "Redonda y gordita, alegre sin gritar." },
] as const;
export type StoreThemeFontId = (typeof STORE_THEME_FONTS)[number]["id"];

/**
 * Fondo del menú: "image" usa la imagen y el color que subió el local;
 * "solid" apaga la imagen y pinta un color liso. Pensado para locales sin
 * imagen de fondo: eligen un neutro de la paleta y el menú se resuelve solo
 * (claro u oscuro según el tono, sombras y bordes ya calibrados para liso).
 */
export type BackgroundMode = "image" | "solid";

export function normalizeBackgroundMode(value: unknown): BackgroundMode {
  return String(value ?? "").trim().toLowerCase() === "solid" ? "solid" : "image";
}

/** Paleta del fondo sólido: del blanco al negro, sin tinte. */
export const SOLID_BACKGROUND_PRESETS = [
  { id: "blanco", label: "Blanco", hex: "#ffffff" },
  { id: "claro", label: "Gris claro", hex: "#f0f0f0" },
  { id: "niebla", label: "Niebla", hex: "#e2e2e2" },
  { id: "piedra", label: "Piedra", hex: "#77777b" },
  { id: "grafito", label: "Grafito", hex: "#2b2b30" },
  { id: "carbon", label: "Carbón", hex: "#161618" },
  { id: "negro", label: "Negro", hex: "#0a0a0a" },
] as const;

export function normalizeSurfaceScheme(value: unknown): SurfaceSchemeSetting {
  const raw = String(value ?? "").trim().toLowerCase();
  return (SURFACE_SCHEMES as readonly string[]).includes(raw) ? (raw as SurfaceSchemeSetting) : "auto";
}

export function normalizeFontFamily(value: unknown): StoreThemeFontId {
  const raw = String(value ?? "").trim().toLowerCase();
  return STORE_THEME_FONTS.some((font) => font.id === raw) ? (raw as StoreThemeFontId) : "montserrat";
}

/**
 * Color del nombre del local: "" = color primario, "hover" = color hover,
 * o un hex de 6 dígitos elegido a mano. Cualquier otra cosa se descarta.
 */
export function normalizeBrandNameColor(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (raw.toLowerCase() === "hover") return "hover";
  if (/^#[a-fA-F0-9]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[a-fA-F0-9]{3}$/.test(raw)) {
    return `#${raw.slice(1).split("").map((c) => c + c).join("")}`.toLowerCase();
  }
  return "";
}

export const PRODUCT_CARD_STYLES = [
  "glass",
  "glass-row",
  "glass-plate",
  "glass-wide",
  "layout-carta",
  "layout-vitrina",
  "layout-cartel",
  "layout-nori",
] as const;

export type ProductCardStyle = (typeof PRODUCT_CARD_STYLES)[number];

/**
 * Tarjetas retiradas el 07-10 (copias de tiendas de ropa, zapatillas o gaming
 * que no se veían bien con comida). Un local que tenía una guardada se ve con
 * la más parecida de las de ahora.
 */
const PRODUCT_CARD_ALIASES: Record<string, ProductCardStyle> = {
  minimal: "glass",
  flat: "glass-row",
  "layout-clean": "glass",
  "layout-detailed": "glass-wide",
  "layout-horizontal": "glass-row",
  "layout-sidebar": "glass",
  "layout-rappi": "glass",
  "layout-sneaker": "glass-plate",
  "layout-skew": "glass-wide",
  "layout-food": "glass-plate",
};

const NAVBAR_ALIASES: Record<string, NavbarType> = {
  tabs: "category-tabs",
  sidebar: "sidebar-categories",
};

export function normalizeProductCardStyle(value: unknown): ProductCardStyle {
  const raw = String(value ?? "").trim();
  const aliased = PRODUCT_CARD_ALIASES[raw] ?? raw;
  if ((PRODUCT_CARD_STYLES as readonly string[]).includes(aliased)) {
    return aliased as ProductCardStyle;
  }
  return DEFAULT_STORE_THEME.productCardStyle as ProductCardStyle;
}

export function normalizeNavbarType(value: unknown): NavbarType {
  const raw = String(value ?? "").trim();
  const aliased = NAVBAR_ALIASES[raw] ?? raw;
  if ((NAVBAR_TYPES as readonly string[]).includes(aliased)) {
    return aliased as NavbarType;
  }
  return DEFAULT_STORE_THEME.navbarType as NavbarType;
}

export function normalizeNavigationMode(value: unknown): NavigationMode {
  const raw = String(value ?? "").trim();
  if ((NAVIGATION_MODES as readonly string[]).includes(raw)) {
    return raw as NavigationMode;
  }
  return DEFAULT_STORE_THEME.navigationMode as NavigationMode;
}

export function normalizeProductDetailsMode(value: unknown): ProductDetailsMode {
  const raw = String(value ?? "").trim();
  if ((PRODUCT_DETAILS_MODES as readonly string[]).includes(raw)) {
    return raw as ProductDetailsMode;
  }
  return "modal-premium"; // Fallback to premium modal
}

/** La familia Cristal: la tarjeta de siempre y sus variantes (fila, plato, foto grande). */
export function isGlassCardStyle(style: unknown): boolean {
  return String(style ?? "").startsWith("glass");
}

/** Clase CSS del grid (`grid-glass`, `grid-layout-cartel`, …). */
export function productCardGridClass(cardStyle: unknown): string {
  return `grid-${normalizeProductCardStyle(cardStyle)}`;
}

function normalizeBackgroundBrightness(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1.8, Math.max(0.2, Math.round(n * 100) / 100));
}

/** Id de plantilla tal cual (lo valida lib/store-theme/menu-templates); cualquier otra cosa → "". */
export function normalizeStoreThemeConfig(
  input: unknown,
  fallbackName = "",
): StoreThemeConfig {
  const value = (input ?? {}) as Record<string, unknown>;
  const defaults: StoreThemeConfig = {
    ...DEFAULT_STORE_THEME,
    displayName: fallbackName || DEFAULT_STORE_THEME.displayName,
  };

  return {
    displayName: String(value.displayName ?? defaults.displayName),
    primaryColor: String(value.primaryColor ?? defaults.primaryColor),
    secondaryColor: String(value.secondaryColor ?? defaults.secondaryColor),
    priceColor: String(value.priceColor ?? defaults.priceColor),
    discountColor: String(value.discountColor ?? defaults.discountColor),
    hoverColor: String(value.hoverColor ?? defaults.hoverColor),
    backgroundColor: String(value.backgroundColor ?? defaults.backgroundColor),
    backgroundBrightness: normalizeBackgroundBrightness(
      value.backgroundBrightness ?? defaults.backgroundBrightness,
    ),
    backgroundImageUrl: String(value.backgroundImageUrl ?? defaults.backgroundImageUrl),
    logoUrl: String(value.logoUrl ?? defaults.logoUrl),
    navbarType: normalizeNavbarType(value.navbarType ?? defaults.navbarType),
    navigationMode: normalizeNavigationMode(value.navigationMode ?? defaults.navigationMode),
    productCardStyle: normalizeProductCardStyle(value.productCardStyle ?? defaults.productCardStyle),
    productDetailsMode: normalizeProductDetailsMode(value.productDetailsMode ?? defaults.productDetailsMode),
    surfaceScheme: normalizeSurfaceScheme(value.surfaceScheme ?? defaults.surfaceScheme),
    backgroundMode: normalizeBackgroundMode(value.backgroundMode ?? defaults.backgroundMode),
    brandNameColor: normalizeBrandNameColor(value.brandNameColor ?? defaults.brandNameColor),
    fontFamily: normalizeFontFamily(value.fontFamily ?? defaults.fontFamily),
    templateId: String(value.templateId ?? defaults.templateId ?? "").slice(0, 64),
    headerStyle: normalizeHeaderStyle(value.headerStyle ?? defaults.headerStyle),
    featuredStyle: normalizeFeaturedStyle(value.featuredStyle ?? defaults.featuredStyle),
    cartStyle: normalizeCartStyle(value.cartStyle ?? defaults.cartStyle),
  };
}

export function isSameStoreTheme(a: StoreThemeConfig, b: StoreThemeConfig): boolean {
  return JSON.stringify(normalizeStoreThemeConfig(a)) === JSON.stringify(normalizeStoreThemeConfig(b));
}

/**
 * Borrador de /cuenta = borrador guardado + solo los campos que el dueño cambió.
 * Claves ajenas al tema de la tienda se ignoran.
 */
export function applyStoreThemeDraftPatch(base: StoreThemeConfig, rawPatch: unknown): StoreThemeConfig {
  const source = asThemeConfigObject(rawPatch);
  const patch: Record<string, unknown> = {};
  for (const key of STORE_THEME_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) patch[key] = source[key];
  }
  return normalizeStoreThemeConfig({ ...base, ...patch });
}
