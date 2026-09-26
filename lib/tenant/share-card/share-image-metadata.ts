/**
 * Imagen de vista previa (og:image / twitter:image) de las páginas públicas de
 * un local. La dibuja `app/[subdomain]/og-image/route.tsx`.
 *
 * La URL lleva la versión de la marca (logo + última edición): WhatsApp y
 * Facebook guardan la imagen por URL, así que un logo nuevo tiene que cambiarla.
 */

/** 1,91:1, lo que WhatsApp, Facebook y X muestran como tarjeta grande. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function buildTenantShareImage(input: { pathPrefix: string; versionSeed: string; name: string }) {
	return {
		url: `${input.pathPrefix}/og-image?v=${encodeURIComponent(input.versionSeed)}`,
		width: SHARE_IMAGE_SIZE.width,
		height: SHARE_IMAGE_SIZE.height,
		alt: `${input.name}: menú digital y pedidos online`,
		type: "image/jpeg",
	};
}
