import type { Metadata } from "next";

import { LANDING_BRAND_NAME } from "./brand";

const SHARE_TITLE = `${LANDING_BRAND_NAME} | Menú digital y POS sin comisiones`;
const DESCRIPTION =
	`${LANDING_BRAND_NAME} es la plataforma SaaS todo-en-uno para restaurantes: menú digital, pedidos online, punto de venta, delivery e inventario. Sin comisiones por venta.`;

export function buildLandingMetadata(base: string): Metadata {
	const canonical = `${base}/`;
	const ogImage = {
		url: `${base}/api/system/og`,
		width: 1200,
		height: 630,
		type: "image/png",
		alt: SHARE_TITLE,
	};

	return {
		metadataBase: new URL(base),
		applicationName: LANDING_BRAND_NAME,
		title: {
			absolute: SHARE_TITLE,
		},
		description: DESCRIPTION,
		keywords: [
			"menú digital para restaurantes",
			"pedidos online para restaurantes",
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
			"plataforma ecommerce",
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
			title: SHARE_TITLE,
			description: DESCRIPTION,
			url: canonical,
			siteName: LANDING_BRAND_NAME,
			locale: "es_ES",
			type: "website",
			images: [ogImage],
		},
		twitter: {
			card: "summary_large_image",
			title: SHARE_TITLE,
			description: DESCRIPTION,
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
