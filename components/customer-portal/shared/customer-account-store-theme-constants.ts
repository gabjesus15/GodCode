import type { StoreThemeConfig } from "./customer-account-types";

export const STORE_THEME_COLOR_FIELDS = [
  ["primaryColor", "Color primario"],
  ["secondaryColor", "Color secundario"],
  ["priceColor", "Color precio"],
  ["discountColor", "Color descuento"],
  ["hoverColor", "Color hover"],
  ["backgroundColor", "Color fondo"],
] as const;

export const STORE_THEME_FIELD_LABELS: Record<keyof StoreThemeConfig, string> = {
  displayName: "Nombre visible",
  primaryColor: "Color primario",
  secondaryColor: "Color secundario",
  priceColor: "Color precio",
  discountColor: "Color descuento",
  hoverColor: "Color hover",
  backgroundColor: "Color fondo",
  backgroundImageUrl: "URL de fondo",
  logoUrl: "URL de logo",
};

export const DEFAULT_STORE_THEME: StoreThemeConfig = {
  displayName: "",
  primaryColor: "#111827",
  secondaryColor: "#111827",
  priceColor: "#ff4757",
  discountColor: "#25d366",
  hoverColor: "#ff2e40",
  backgroundColor: "#0a0a0a",
  backgroundImageUrl: "",
  logoUrl: "",
};

export const STORE_THEME_COLOR_HELPERS: Record<
  keyof Pick<StoreThemeConfig, "primaryColor" | "secondaryColor" | "priceColor" | "discountColor" | "hoverColor" | "backgroundColor">,
  string
> = {
  primaryColor: "Se usa en CTA principal y tabs activos.",
  secondaryColor: "Refuerza acentos secundarios y etiquetas.",
  priceColor: "Color del precio destacado en cards de producto.",
  discountColor: "Color de badges de descuento y ahorro.",
  hoverColor: "Color al pasar mouse sobre CTA y acciones.",
  backgroundColor: "Fondo base del menú cuando no hay imagen.",
};

export const STORE_THEME_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  colors: Pick<StoreThemeConfig, "primaryColor" | "secondaryColor" | "priceColor" | "discountColor" | "hoverColor" | "backgroundColor">;
}> = [
  {
    id: "sushi-night",
    name: "Sushi Night",
    description: "Tonos intensos para gastronomía nocturna y alto contraste.",
    colors: {
      primaryColor: "#eb3b00",
      secondaryColor: "#ff4f00",
      priceColor: "#ffffff",
      discountColor: "#25d366",
      hoverColor: "#ff6a2a",
      backgroundColor: "#111111",
    },
  },
  {
    id: "coffee-warm",
    name: "Coffee Warm",
    description: "Paleta cálida para cafeterías y pastelería.",
    colors: {
      primaryColor: "#7c3f1d",
      secondaryColor: "#b1622c",
      priceColor: "#ffe8c2",
      discountColor: "#8ee381",
      hoverColor: "#9b5229",
      backgroundColor: "#2a1a12",
    },
  },
  {
    id: "fresh-market",
    name: "Fresh Market",
    description: "Estilo claro y fresco para retail alimentario.",
    colors: {
      primaryColor: "#0f766e",
      secondaryColor: "#14b8a6",
      priceColor: "#f8fafc",
      discountColor: "#84cc16",
      hoverColor: "#0d9488",
      backgroundColor: "#134e4a",
    },
  },
];
