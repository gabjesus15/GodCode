import "server-only";

import type { AppLocale } from "@/lib/i18n/config";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";
import { getAppUrl } from "@/lib/tenant/app-url";

import {
	LANDING_BRAND_ALTERNATE,
	LANDING_COMPANY_DESCRIPTION,
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
	LANDING_SUPPORT_EMAIL,
} from "./brand";
import { getLandingOrganizationSameAs } from "./contact";
import { LANDING_FAQ } from "./faq";
import { formatLlmsTxtLink } from "@/lib/seo/llms-txt-format";

function profileNetworkName(url: string): string {
	if (/linkedin\.com/i.test(url)) return "LinkedIn";
	if (/instagram\.com/i.test(url)) return "Instagram";
	return "Perfil";
}

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
		markdown += `# ${LANDING_PRODUCT_NAME} por ${LANDING_COMPANY_NAME} (antes ${LANDING_BRAND_ALTERNATE}) - Plataforma SaaS para restaurantes\n\n`;
		markdown += `> ${LANDING_PRODUCT_NAME} es la plataforma todo-en-uno de ${LANDING_COMPANY_NAME} para restaurantes y negocios con sucursales: menú digital, pedidos online, punto de venta (POS), delivery e inventario. Sin comisiones por venta.\n\n`;
		markdown += `Archivo detallado para modelos de lenguaje (LLMs) y motores de búsqueda generativos (GEO).\n\n`;
	} else {
		markdown += `# ${LANDING_PRODUCT_NAME} por ${LANDING_COMPANY_NAME}\n\n`;
		markdown += `> Menú digital, pedidos online y caja para restaurantes. Sin comisiones por venta. También conocido como Gcode o ${LANDING_BRAND_ALTERNATE}.\n\n`;
		markdown += `Resumen optimizado para LLMs y GEO sobre ${LANDING_COMPANY_NAME} y su producto ${LANDING_PRODUCT_NAME}.\n\n`;
	}

	markdown += `## Quién está detrás\n`;
	markdown += `${LANDING_COMPANY_DESCRIPTION}\n\n`;

	markdown += `## Enlaces principales\n`;
	markdown += `${formatLlmsTxtLink("Sitio principal", `${base}/`, "Página de inicio")}\n`;
	markdown += `${formatLlmsTxtLink("Registro y onboarding", `${base}/onboarding`, "Crear cuenta nueva")}\n`;
	markdown += `${formatLlmsTxtLink(`Sobre ${LANDING_COMPANY_NAME}`, `${base}/sobre-godcode`, "Información institucional: estudio web y creadores de Gcode POS")}\n`;
	markdown += `${formatLlmsTxtLink("Calculadora de comisiones", `${base}/calculadora-comisiones`, "Cuánto cobran las apps de delivery y cuánto se ahorra con tienda propia")}\n`;
	if (isFullVersion) {
		markdown += `${formatLlmsTxtLink("Resumen IA (llms.txt)", `${base}/llms.txt`, "Versión resumida para LLMs")}\n`;
	} else {
		markdown += `${formatLlmsTxtLink("Catálogo completo para IA (llms-full.txt)", `${base}/llms-full.txt`, "Versión extendida para LLMs")}\n`;
	}
	markdown += `\n`;

	const officialProfiles = getLandingOrganizationSameAs();
	if (officialProfiles.length > 0) {
		markdown += `## Perfiles oficiales de ${LANDING_COMPANY_NAME}\n`;
		for (const url of officialProfiles) {
			const network = profileNetworkName(url);
			markdown += `${formatLlmsTxtLink(network, url, `Perfil oficial de ${LANDING_COMPANY_NAME} en ${network}`)}\n`;
		}
		markdown += `\n`;
	}

	markdown += `## Qué es ${LANDING_PRODUCT_NAME}\n`;
	markdown += `${LANDING_PRODUCT_NAME} ayuda a restaurantes y negocios con sucursales a vender online con:\n`;
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
	markdown += `${formatLlmsTxtLink("Soporte por email", `mailto:${LANDING_SUPPORT_EMAIL}`, LANDING_SUPPORT_EMAIL)}\n`;
	markdown += `${formatLlmsTxtLink("Registro", `${base}/onboarding`, "Alta de nuevos negocios")}\n`;

	return markdown;
}
