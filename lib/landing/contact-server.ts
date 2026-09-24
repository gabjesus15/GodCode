import "server-only";

import { LANDING_SUPPORT_EMAIL } from "./brand";
import {
	getLandingSocialLinksFromEnv,
	LANDING_INSTAGRAM_URL_DEFAULT,
	LANDING_LINKEDIN_URL_DEFAULT,
	LANDING_WHATSAPP_URL_DEFAULT,
	type LandingSocialLink,
	type LandingSocialLinkKind,
	instagramDisplay,
	normalizeInstagramUrl,
	normalizeLinkedInUrl,
	normalizeWhatsAppUrl,
	whatsappDisplay,
} from "./contact";
import { loadLandingV3Config } from "./v3-config";

function pushSocialLink(
	links: LandingSocialLink[],
	kind: LandingSocialLinkKind,
	raw: string | undefined,
	fallback: string,
	label: string,
	displayFromUrl: (url: string) => string,
) {
	const normalized =
		kind === "instagram"
			? normalizeInstagramUrl(raw || fallback)
			: kind === "linkedin"
				? normalizeLinkedInUrl(raw || fallback)
				: normalizeWhatsAppUrl(raw || fallback);
	if (!normalized) return;
	links.push({
		kind,
		href: normalized,
		label,
		display: displayFromUrl(normalized),
	});
}

export async function getLandingSocialLinks(): Promise<LandingSocialLink[]> {
	try {
		const config = await loadLandingV3Config();
		const links: LandingSocialLink[] = [];

		pushSocialLink(
			links,
			"instagram",
			config.contact.instagramUrl ?? undefined,
			LANDING_INSTAGRAM_URL_DEFAULT,
			"Instagram de Gcode",
			instagramDisplay,
		);
		pushSocialLink(
			links,
			"linkedin",
			process.env.NEXT_PUBLIC_LANDING_LINKEDIN_URL?.trim() || undefined,
			LANDING_LINKEDIN_URL_DEFAULT,
			"LinkedIn de Gcode Labs",
			() => "LinkedIn",
		);
		pushSocialLink(
			links,
			"whatsapp",
			config.contact.whatsappUrl ?? undefined,
			LANDING_WHATSAPP_URL_DEFAULT,
			"WhatsApp de Gcode",
			whatsappDisplay,
		);

		if (LANDING_SUPPORT_EMAIL) {
			links.push({
				kind: "email",
				href: `mailto:${LANDING_SUPPORT_EMAIL}`,
				label: "Email de contacto",
				display: LANDING_SUPPORT_EMAIL,
			});
		}

		return links;
	} catch {
		return getLandingSocialLinksFromEnv();
	}
}
