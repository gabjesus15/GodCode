import { whatsappUrlFromPhone } from "@/lib/tenant/whatsapp-url";

import { LANDING_SUPPORT_EMAIL } from "./brand";

/** Contacto público de la landing (sobrescribible con env en Vercel). */
export const LANDING_INSTAGRAM_URL_DEFAULT = "https://www.instagram.com/gcode.labs/";
export const LANDING_WHATSAPP_URL_DEFAULT = "56943848080";
export const LANDING_LINKEDIN_URL_DEFAULT = "https://www.linkedin.com/company/gcode-labs/";

export type LandingSocialLinkKind = "email" | "instagram" | "linkedin" | "whatsapp";

export type LandingSocialLink = {
	kind: LandingSocialLinkKind;
	href: string;
	label: string;
	display: string;
};

function normalizeInstagramUrl(raw: string | undefined): string | null {
	const value = raw?.trim();
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return value;
	const handle = value.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/\/$/, "");
	if (!handle || !/^[a-z0-9._]+$/i.test(handle)) return null;
	return `https://instagram.com/${handle}`;
}

function normalizeLinkedInUrl(raw: string | undefined): string | null {
	const value = raw?.trim();
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return value;
	const slug = value
		.replace(/^(www\.)?linkedin\.com\//i, "")
		.replace(/^company\//i, "")
		.replace(/\/$/, "");
	if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return null;
	return `https://www.linkedin.com/company/${slug}/`;
}

/**
 * Un enlace completo se respeta tal cual; un número se convierte en `wa.me` con la misma
 * regla que el WhatsApp de cada negocio (`lib/tenant/whatsapp-url`): solo dígitos, entre 8 y
 * 15. Sin país: el número de ventas se escribe siempre con su código.
 */
function normalizeWhatsAppUrl(raw: string | undefined): string | null {
	const value = raw?.trim();
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return value;
	return whatsappUrlFromPhone(value, null);
}

/**
 * Primer mensaje del chat de ventas de Gcode POS. Con el texto escrito, quien duda solo tiene que
 * tocar «Enviar» (empezar una conversación en blanco es justo lo que frena), y sabemos que viene de la web.
 */
export const LANDING_POS_WHATSAPP_GREETING = "Hola, vi Gcode POS en la web y quiero saber si me sirve para mi restaurante.";

/** Deja el chat abierto con `text` ya escrito. Solo enlaces wa.me / api.whatsapp.com y sin texto propio. */
export function withWhatsAppText(url: string, text: string): string {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();
		if ((host !== "wa.me" && host !== "api.whatsapp.com") || parsed.searchParams.has("text")) return url;
		return `${url}${parsed.search ? "&" : "?"}text=${encodeURIComponent(text)}`;
	} catch {
		return url;
	}
}

/**
 * Los enlaces de contacto con el WhatsApp ya saludando: lo usan la home y las páginas de país
 * (mismo número de ventas, mismo saludo). La home de Gcode Labs pasa su propio saludo.
 */
export function landingSocialLinksWithGreeting(
	links: LandingSocialLink[],
	greeting: string = LANDING_POS_WHATSAPP_GREETING,
): LandingSocialLink[] {
	return links.map((link) => (link.kind === "whatsapp" ? { ...link, href: withWhatsAppText(link.href, greeting) } : link));
}

function instagramDisplay(url: string): string {
	try {
		const handle = new URL(url).pathname.replace(/\//g, "").trim();
		return handle ? `@${handle}` : "Instagram";
	} catch {
		return "Instagram";
	}
}

function whatsappDisplay(url: string): string {
	try {
		const host = new URL(url).hostname.toLowerCase();
		if (host.includes("wa.me")) {
			const phone = new URL(url).pathname.replace(/\//g, "").trim();
			return phone ? `+${phone}` : "WhatsApp";
		}
	} catch {
		// fallback below
	}
	return "WhatsApp";
}

export function getLandingSocialLinksFromEnv(): LandingSocialLink[] {
	const links: LandingSocialLink[] = [];

	const instagramUrl = normalizeInstagramUrl(
		process.env.NEXT_PUBLIC_LANDING_INSTAGRAM_URL?.trim() || LANDING_INSTAGRAM_URL_DEFAULT,
	);
	if (instagramUrl) {
		links.push({
			kind: "instagram",
			href: instagramUrl,
			label: "Instagram de Gcode",
			display: instagramDisplay(instagramUrl),
		});
	}

	const linkedinUrl = normalizeLinkedInUrl(
		process.env.NEXT_PUBLIC_LANDING_LINKEDIN_URL?.trim() || LANDING_LINKEDIN_URL_DEFAULT,
	);
	if (linkedinUrl) {
		links.push({
			kind: "linkedin",
			href: linkedinUrl,
			label: "LinkedIn de Gcode Labs",
			display: "LinkedIn",
		});
	}

	const whatsappUrl = normalizeWhatsAppUrl(
		process.env.NEXT_PUBLIC_LANDING_WHATSAPP_URL?.trim() || LANDING_WHATSAPP_URL_DEFAULT,
	);
	if (whatsappUrl) {
		links.push({
			kind: "whatsapp",
			href: whatsappUrl,
			label: "WhatsApp de Gcode",
			display: whatsappDisplay(whatsappUrl),
		});
	}

	if (LANDING_SUPPORT_EMAIL) {
		links.push({
			kind: "email",
			href: `mailto:${LANDING_SUPPORT_EMAIL}`,
			label: "Email de contacto",
			display: LANDING_SUPPORT_EMAIL,
		});
	}

	return links;
}

/** URLs públicas de perfiles para Organization.sameAs (schema SEO). */
export function getLandingOrganizationSameAs(): string[] {
	const urls: string[] = [];
	const instagramUrl = normalizeInstagramUrl(
		process.env.NEXT_PUBLIC_LANDING_INSTAGRAM_URL?.trim() || LANDING_INSTAGRAM_URL_DEFAULT,
	);
	if (instagramUrl) urls.push(instagramUrl);
	const linkedinUrl = normalizeLinkedInUrl(
		process.env.NEXT_PUBLIC_LANDING_LINKEDIN_URL?.trim() || LANDING_LINKEDIN_URL_DEFAULT,
	);
	if (linkedinUrl) urls.push(linkedinUrl);
	return urls;
}

export {
	normalizeInstagramUrl,
	normalizeLinkedInUrl,
	normalizeWhatsAppUrl,
	instagramDisplay,
	whatsappDisplay,
};
