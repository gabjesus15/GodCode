import { LANDING_PRODUCT_NAME } from "./brand";

/**
 * Guía «¿Cuánto cobran PedidosYa, Uber Eats y Rappi en Chile?» (/comisiones-delivery-chile).
 *
 * Responde la pregunta que hace el dueño antes de buscar un sistema propio, con cifras que
 * se pueden comprobar: cada dato lleva su fuente oficial y la fecha en que se revisó. Nada
 * de promedios del rubro sin fuente. Si una app cambia sus tarifas, se corrige aquí y se
 * actualiza `COMMISSIONS_GUIDE_REVIEWED_AT`.
 *
 * El texto visible y el JSON-LD (Article + FAQPage) salen de estos mismos datos.
 */

/** Fecha en que se revisaron las fuentes (ISO). Se muestra como «Actualizado el …». */
export const COMMISSIONS_GUIDE_REVIEWED_AT = "2026-10-13";
export const COMMISSIONS_GUIDE_PUBLISHED_AT = "2026-10-13";

export const COMMISSIONS_GUIDE_TITLE = "Comisiones de PedidosYa, Uber Eats y Rappi en Chile";
export const COMMISSIONS_GUIDE_DESCRIPTION =
	"Cuánto cobra cada app de delivery a un restaurante en Chile, con fuentes oficiales: tarifas de Uber Eats, cómo fijan PedidosYa y Rappi la suya, el IVA y lo que cambió con la FNE.";

export const COMMISSIONS_GUIDE_SOURCES = {
	uberEatsPricing: {
		label: "Uber Eats para comercios: precios en Chile",
		url: "https://merchants.ubereats.com/cl/es/pricing/",
	},
	pedidosYaPartners: {
		label: "PedidosYa: portal de socios en Chile",
		url: "https://socios.pedidosya.cl/s/?countryIsoCode=CL&language=es",
	},
	rappiMerchants: {
		label: "Rappi: únete como comercio en Chile",
		url: "https://merchants.rappi.com/es-cl/unete-a-rappi",
	},
	fneAgreements2023: {
		label: "FNE: el TDLC aprueba los acuerdos con Uber Eats, PedidosYa y Rappi (28-12-2023)",
		url: "https://www.fne.gob.cl/tdlc-aprueba-acuerdos-extrajudiciales-firmados-entre-la-fne-y-las-plataformas-uber-eats-pedidosya-y-rappi-que-eliminan-las-clausulas-de-nacion-mas-favorec/",
	},
	fnePedidosYa2026: {
		label: "FNE: pide al TDLC una multa contra PedidosYa (11-03-2026)",
		url: "https://www.fne.gob.cl/fne-pide-al-tdlc-multa-de-us-38-millones-contra-pedidos-ya-por-incumplir-acuerdo-extrajudicial-aprobado-en-2023/",
	},
} as const;

export type CommissionsGuideSourceKey = keyof typeof COMMISSIONS_GUIDE_SOURCES;

/** Lo que cada app publica sobre su comisión en Chile. */
export const COMMISSIONS_BY_APP: { app: string; published: string; detail: string; source: CommissionsGuideSourceKey }[] = [
	{
		app: "Uber Eats",
		published: "25 %, 27 % o 29 %",
		detail: "Por pedido con delivery, según el plan: Lite 25 %, Plus 27 % y Premium 29 %. Por pedido para retirar, 20 %.",
		source: "uberEatsPricing",
	},
	{
		app: "PedidosYa",
		published: "No publica una tarifa general",
		detail: "El porcentaje se acuerda en el contrato de cada local y aparece en tu liquidación.",
		source: "pedidosYaPartners",
	},
	{
		app: "Rappi",
		published: "No publica una tarifa general",
		detail: "La comisión depende del país y del comercio, y se informa durante el registro.",
		source: "rappiMerchants",
	},
];

/** IVA en Chile: la comisión es un servicio y se factura con IVA. */
export const CHILE_VAT_PERCENT = 19;

/**
 * Ejemplo con $100.000 de venta, solo aritmética sobre las tarifas publicadas de Uber Eats
 * (no son ventas de nadie): comisión, IVA sobre la comisión y lo que le queda al local.
 */
export function commissionOn100k(percent: number): { commission: number; vat: number; total: number; remaining: number } {
	const sale = 100_000;
	const commission = Math.round((sale * percent) / 100);
	const vat = Math.round((commission * CHILE_VAT_PERCENT) / 100);
	return { commission, vat, total: commission + vat, remaining: sale - commission - vat };
}

export const COMMISSIONS_GUIDE_FAQ: { question: string; answer: string }[] = [
	{
		question: "¿Cuánto cobra Uber Eats a un restaurante en Chile?",
		answer:
			"Uber Eats publica tres planes para Chile: Lite, con 25 % por pedido con delivery; Plus, con 27 %; y Premium, con 29 %. Los pedidos para retirar pagan 20 %. Sobre la comisión se suma el IVA.",
	},
	{
		question: "¿Cuánto cobra PedidosYa de comisión en Chile?",
		answer:
			"PedidosYa no publica una tarifa general para Chile: el porcentaje se acuerda en el contrato de cada local. Lo encuentras en tu contrato o en la liquidación que te envía la app.",
	},
	{
		question: "¿Puedo vender más barato en mi propio canal que en las apps?",
		answer:
			"Sí. Desde los acuerdos que aprobó el Tribunal de Defensa de la Libre Competencia en diciembre de 2023, Uber Eats, PedidosYa y Rappi no pueden exigirte el mismo precio que en la app en tu local o en tu propio delivery, y deben informarte que fijas tus precios con libertad.",
	},
	{
		question: "¿Conviene dejar las apps de delivery?",
		answer:
			`No hace falta. Las apps sirven para que te encuentren clientes nuevos. Lo que conviene es que los clientes que ya te conocen, los que repiten o te siguen en Instagram, te pidan por tu propio link, donde no pagas comisión. Eso es lo que hace ${LANDING_PRODUCT_NAME}.`,
	},
];

/** «13 de octubre de 2026». */
export function formatGuideDate(iso: string): string {
	const [year, month, day] = iso.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es-CL", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

/** «$29.000», con punto de miles como en Chile. */
export function formatClp(value: number): string {
	return `$${value.toLocaleString("es-CL")}`;
}
