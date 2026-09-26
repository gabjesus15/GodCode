import type { Metadata } from "next";

import {
	LANDING_BRAND_ALTERNATE,
	LANDING_BRAND_NAME,
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
} from "./brand";

/**
 * Fuente única para title/description de marketing (home + fallback root).
 *
 * El título termina en el nombre de la empresa a propósito: Google toma el
 * texto tras el último separador como candidato a "nombre del sitio".
 */
// ~60 caracteres: lo que Google muestra sin cortar. Lleva las dos búsquedas principales.
export const LANDING_SHARE_TITLE = `${LANDING_PRODUCT_NAME}: menú digital y POS para restaurantes | ${LANDING_COMPANY_NAME}`;
// ~155 caracteres: menú QR, pedidos online, POS, delivery y "sin comisiones", que es el diferencial.
export const LANDING_DESCRIPTION =
	`Menú digital con QR, pedidos online y sistema POS para restaurantes, sin comisiones por venta. Delivery, caja e inventario en un solo panel con ${LANDING_PRODUCT_NAME}.`;

export function buildLandingMetadata(base: string): Metadata {
	const canonical = `${base}/`;
	const ogImage = {
		url: `${base}/api/system/og`,
		width: 1200,
		height: 630,
		type: "image/png",
		alt: LANDING_SHARE_TITLE,
	};

	return {
		metadataBase: new URL(base),
		applicationName: LANDING_PRODUCT_NAME,
		title: {
			absolute: LANDING_SHARE_TITLE,
		},
		description: LANDING_DESCRIPTION,
		// Google ya no usa esta etiqueta para posicionar, pero otros buscadores y herramientas sí la leen.
		keywords: [
			"menú digital para restaurantes",
			"menú digital QR",
			"carta digital",
			"pedidos online para restaurantes",
			"sistema de pedidos para restaurantes",
			"pedidos por WhatsApp",
			"POS para restaurantes",
			"sistema POS para restaurantes",
			"punto de venta para restaurantes",
			"software para restaurantes",
			"POS sin comisiones",
			"delivery sin comisiones",
			"alternativa a apps de delivery",
			"delivery para restaurantes",
			"caja para restaurantes",
			"inventario para restaurantes",
			"restaurantes con varias sucursales",
			LANDING_COMPANY_NAME,
			LANDING_PRODUCT_NAME,
			LANDING_BRAND_NAME,
			LANDING_BRAND_ALTERNATE,
		],
		alternates: {
			canonical,
			languages: {
				es: canonical,
				"x-default": canonical,
			},
		},
		openGraph: {
			title: LANDING_SHARE_TITLE,
			description: LANDING_DESCRIPTION,
			url: canonical,
			siteName: LANDING_COMPANY_NAME,
			locale: "es_LA",
			type: "website",
			images: [ogImage],
		},
		twitter: {
			card: "summary_large_image",
			title: LANDING_SHARE_TITLE,
			description: LANDING_DESCRIPTION,
			images: [ogImage.url],
		},
		robots: {
			index: true,
			follow: true,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	};
}
