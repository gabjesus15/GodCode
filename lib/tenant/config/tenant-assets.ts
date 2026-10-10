/*
 * Los productos no tienen foto de respaldo a propósito: sin foto propia se pinta su inicial
 * (ProductPhotoFallback); una foto de stock hacía pasar una pizza por un plato de carne.
 */

/**
 * Hero / banners. Respaldo del carrusel que en producción no llega a verse: los banners sin
 * imagen utilizable se descartan antes (lib/tenant/cached-menu.ts y app/[subdomain]/menu/page.tsx).
 */
export const TENANT_HERO_FALLBACK_IMAGE =
	"https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";
