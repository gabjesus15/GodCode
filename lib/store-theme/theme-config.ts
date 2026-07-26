import { DEFAULT_STORE_THEME } from "@/components/customer-portal/shared/customer-account-store-theme-constants";
import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";

export const NAVBAR_TYPES = [
  "category-tabs",
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

export const PRODUCT_CARD_STYLES = [
  "glass",
  "layout-clean",
  "layout-detailed",
  "layout-horizontal",
  "layout-sidebar",
  "layout-rappi",
  "layout-sneaker",
  "layout-skew",
  "layout-food",
] as const;

export type ProductCardStyle = (typeof PRODUCT_CARD_STYLES)[number];

const PRODUCT_CARD_ALIASES: Record<string, ProductCardStyle> = {
  minimal: "layout-clean",
  flat: "layout-horizontal",
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

/** Clase CSS del grid (`grid-glass`, `grid-layout-clean`, …). */
export function productCardGridClass(cardStyle: unknown): string {
  return `grid-${normalizeProductCardStyle(cardStyle)}`;
}

export function normalizeBackgroundBrightness(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1.8, Math.max(0.2, Math.round(n * 100) / 100));
}

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
  };
}

export function isSameStoreTheme(a: StoreThemeConfig, b: StoreThemeConfig): boolean {
  return JSON.stringify(normalizeStoreThemeConfig(a)) === JSON.stringify(normalizeStoreThemeConfig(b));
}
