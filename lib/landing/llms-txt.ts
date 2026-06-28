import "server-only";

import type { AppLocale } from "@/lib/i18n/config";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";
import { getAppUrl } from "@/lib/tenant/app-url";

import { LANDING_BRAND_ALTERNATE, LANDING_BRAND_NAME, LANDING_SUPPORT_EMAIL } from "./brand";
import { LANDING_FAQ } from "./faq";

function formatPlanPrice(price: number, currency: string): string {
	try {
		return new Intl.NumberFormat("es-CL", {
			style: "currency",
			currency,
			maximumFractionDigits: price % 1 === 0 ? 0 : 2,
		}).format(price);
	} catch {
		return `${price} ${currency}`;
	}
}

export async function getMainDomainLlmsTxt(isFullVersion = false): Promise<string> {
	const base = getAppUrl().replace(/\/$/, "");
	const locale: AppLocale = "es";
	const plans = await getPublicPlansForLanding(locale);
	const country = "CL";

	let markdown = "";

	if (isFullVersion) {
		markdown += `# ${LANDING_BRAND_NAME} (${LANDING_BRAND_ALTERNATE}) - Plataforma SaaS para restaurantes\n\n`;
		markdown += `> ${LANDING_BRAND_NAME} es la plataforma todo-en-uno para restaurantes y negocios con sucursales: menú digital, pedidos online, punto de venta (POS), delivery e inventario. Sin comisiones por venta.\n\n`;
		markdown += `Archivo detallado para modelos de lenguaje (LLMs) y motores de búsqueda generativos (GEO).\n\n`;
	} else {
		markdown += `# ${LANDING_BRAND_NAME}\n\n`;
		markdown += `> Menú digital, pedidos online y caja para restaurantes. Sin comisiones por venta. También conocido como ${LANDING_BRAND_ALTERNATE}.\n\n`;
		markdown += `Resumen optimizado para LLMs y GEO sobre el producto ${LANDING_BRAND_NAME}.\n\n`;
	}

	markdown += `## Enlaces canónicos\n`;
	markdown += `- **Sitio principal**: ${base}/\n`;
	markdown += `- **Registro / onboarding**: ${base}/onboarding\n`;
	markdown += `- **Sobre la marca**: ${base}/sobre-godcode\n`;
	if (isFullVersion) {
		markdown += `- **Resumen IA (llms.txt)**: ${base}/llms.txt\n`;
	} else {
		markdown += `- **Catálogo completo para IA (llms-full.txt)**: ${base}/llms-full.txt\n`;
	}
	markdown += `\n`;

	markdown += `## Qué es ${LANDING_BRAND_NAME}\n`;
	markdown += `${LANDING_BRAND_NAME} ayuda a restaurantes y negocios con sucursales a vender online con:\n`;
	markdown += `- Menú digital con fotos, categorías y precios\n`;
	markdown += `- Pedidos online y carrito\n`;
	markdown += `- Punto de venta (caja) y comandas\n`;
	markdown += `- Delivery e inventario\n`;
	markdown += `- Dominio propio por negocio (subdominio o dominio custom)\n`;
	markdown += `- **Sin comisiones por venta** (modelo de suscripción mensual)\n`;
	markdown += `- Promoción de primer pago: 2 meses al precio de 1\n\n`;

	if (plans.length > 0) {
		markdown += `## Planes y precios (referencia ${country})\n`;
		for (const plan of plans) {
			const { price, currency } = resolveRegionalPlanPrice(plan, country);
			const priceLabel = formatPlanPrice(price, currency);
			markdown += `### ${plan.name}\n`;
			markdown += `- **Precio**: ${priceLabel}/mes\n`;
			for (const bullet of plan.featureBullets) {
				markdown += `- ${bullet}\n`;
			}
			markdown += `\n`;
		}
	}

	markdown += `## Preguntas frecuentes\n`;
	for (const item of LANDING_FAQ) {
		markdown += `### ${item.question}\n${item.answer}\n\n`;
	}

	markdown += `## Contacto y soporte\n`;
	markdown += `- **Email**: ${LANDING_SUPPORT_EMAIL}\n`;
	markdown += `- **Registro**: ${base}/onboarding\n`;

	return markdown;
}
