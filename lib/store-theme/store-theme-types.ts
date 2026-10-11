/**
 * Tema del menú público de un negocio (`companies.theme_config`). Vive en lib/ porque también lo
 * usa el servicio de alta, que solo compila lib/ y utils/; el portal lo reexporta desde
 * `customer-account-types`.
 */
export type StoreThemeConfig = {
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  priceColor: string;
  discountColor: string;
  hoverColor: string;
  backgroundColor: string;
  /** Brillo de la imagen de fondo (0.2–1.8). `null` = automático según opacidad del color. */
  backgroundBrightness: number | null;
  backgroundImageUrl: string;
  logoUrl: string;
  navbarType?: string;
  navigationMode?: string;
  productCardStyle?: string;
  productDetailsMode?: string;
  /** Claro u oscuro para tarjetas y cromo del menú; "auto" sigue al color de fondo. */
  surfaceScheme?: string;
  /** "image" (imagen + color) o "solid" (solo color liso, sin imagen). */
  backgroundMode?: string;
  /** Color del nombre del local en el header; vacío = color primario. */
  brandNameColor?: string;
  /** Tipografía del menú público (id de STORE_THEME_FONTS). */
  fontFamily?: string;
  /** Plantilla de menú elegida (id de MENU_TEMPLATES); vacío = ninguna. */
  templateId?: string;
  /** Cabecera del menú: "bar" o "cover" (portada con foto y logo grande). */
  headerStyle?: string;
  /** Destacados ("Solo hoy"): "section" o "carousel". */
  featuredStyle?: string;
  /** Carrito: "float" (botón) o "bar" (barra con el total). */
  cartStyle?: string;
};

export type StoreThemeAssetField = "logoUrl" | "backgroundImageUrl";
