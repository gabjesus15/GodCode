import { LANDING_COMPANY_ADDRESS, LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME, LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { getAppUrl } from "@/lib/tenant/app-url";

/**
 * Identidad de los correos. Sale de la misma fuente que el landing (`lib/landing/brand`)
 * para que el cliente reconozca el remitente: antes los correos firmaban con el nombre anterior de la marca y
 * con un violeta que no era el suyo.
 *
 * Opcional en .env:
 *   EMAIL_LOGO_URL   URL absoluta de un PNG cuadrado (por defecto `<app>/logo.png`).
 *   EMAIL_REPLY_TO   A dónde van las respuestas (por defecto el correo de soporte).
 */
export type EmailBrand = {
	product: string;
	company: string;
	location: string;
	supportEmail: string;
	replyTo: string;
	appUrl: string;
	logoUrl: string;
	color: string;
};

export function getEmailBrand(): EmailBrand {
	const appUrl = getAppUrl().replace(/\/+$/, "");
	const supportEmail = LANDING_SUPPORT_EMAIL;
	return {
		product: LANDING_PRODUCT_NAME,
		company: LANDING_COMPANY_NAME,
		location: LANDING_COMPANY_ADDRESS.addressLocality === "Santiago" ? "Santiago, Chile" : LANDING_COMPANY_ADDRESS.addressLocality,
		supportEmail,
		replyTo: process.env.EMAIL_REPLY_TO?.trim() || supportEmail,
		appUrl,
		logoUrl: process.env.EMAIL_LOGO_URL?.trim() || `${appUrl}/logo.png`,
		color: "#4F5BFF",
	};
}

/** Enlaces de la cuenta del dueño; `tab` abre directo esa sección de /cuenta. */
export function accountUrl(tab?: "plan" | "facturacion" | "soporte" | "resumen"): string {
	const base = `${getEmailBrand().appUrl}/cuenta`;
	return tab ? `${base}?tab=${tab}` : base;
}
