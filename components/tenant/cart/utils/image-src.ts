import { isCloudinaryImageUrl } from "@/lib/tenant/images/is-cloudinary-image-url";

/** Lo único que `next/image` acepta sin lanzar: URL absoluta http(s), ruta desde raíz, blob o data. */
const RENDERABLE_SRC = /^(https?:\/\/|\/(?!\/)|blob:|data:)/i;

export function isRenderableImageSrc(value: string | null | undefined): boolean {
	const src = String(value ?? "").trim();
	return src.length > 0 && RENDERABLE_SRC.test(src);
}

/**
 * `src` seguro para la foto de un producto, o `null` si no tiene una utilizable. Una clave
 * de storage sin resolver o una URL legacy de Cloudinary no deben tumbar next/image: sin
 * foto se pinta la inicial del producto (ProductPhotoFallback), nunca una foto de stock.
 */
export function safeImageSrc(value: string | null | undefined): string | null {
	const src = String(value ?? "").trim();
	if (!src || isCloudinaryImageUrl(src) || !isRenderableImageSrc(src)) return null;
	return src;
}
