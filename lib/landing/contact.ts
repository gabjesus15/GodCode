import { LANDING_SUPPORT_EMAIL } from "./brand";

/** Contacto público de la landing (sobrescribible con env en Vercel). */
export const LANDING_INSTAGRAM_URL_DEFAULT = "https://www.instagram.com/gcode.labs/";
export const LANDING_WHATSAPP_URL_DEFAULT = "56943848080";

export type LandingSocialLinkKind = "email" | "instagram" | "whatsapp";

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

function normalizeWhatsAppUrl(raw: string | undefined): string | null {
	const value = raw?.trim();
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return value;
	const digits = value.replace(/\D/g, "");
	if (digits.length < 8) return null;
	return `https://wa.me/${digits}`;
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

export {
	normalizeInstagramUrl,
	normalizeWhatsAppUrl,
	instagramDisplay,
	whatsappDisplay,
};
