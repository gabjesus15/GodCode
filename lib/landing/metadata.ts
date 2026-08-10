import type { Metadata } from "next";

import { LANDING_BRAND_NAME } from "./brand";

/** Fuente única para title/description de marketing (home + fallback root). */
export const LANDING_SHARE_TITLE = `${LANDING_BRAND_NAME} | Menú digital y POS sin comisiones`;
export const LANDING_DESCRIPTION =
	`${LANDING_BRAND_NAME} es la plataforma todo-en-uno para restaurantes: menú digital, pedidos online, punto de venta, delivery e inventario. Sin comisiones por venta.`;

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
		applicationName: LANDING_BRAND_NAME,
		title: {
			absolute: LANDING_SHARE_TITLE,
		},
		description: LANDING_DESCRIPTION,
		keywords: [
			"menú digital para restaurantes",
			"pedidos online para restaurantes",
			"POS para restaurantes",
			"POS sin comisiones",
			"delivery para restaurantes",
			"menú digital",
			"pedidos online",
			"sistema de pedidos",
			"delivery",
			"punto de venta",
			"inventario",
			"caja",
			"sucursales",
			"SaaS para restaurantes",
			LANDING_BRAND_NAME,
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
			siteName: LANDING_BRAND_NAME,
			locale: "es_ES",
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
