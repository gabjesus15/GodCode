/**
 * Página de inicio del negocio (link-in-bio): qué enlaces muestra, en qué
 * orden, con qué redes y con qué apariencia.
 *
 * Vive en `companies.theme_config.homePage`. Todos los que escriben
 * `theme_config` hacen merge superficial (ver merge-theme-config), así que la
 * clave sobrevive a las publicaciones del tema de la tienda y a los cambios de
 * plan. El Panel (otro repo) solo la lee.
 *
 * Este módulo es puro (sin servidor ni DOM): lo usan la página pública, la API
 * que guarda y el editor de /cuenta, y todos normalizan con la misma función.
 */

import { readThemeConfigObject } from "@/lib/store-theme/merge-theme-config";

export const HOME_PAGE_THEME_KEY = "homePage" as const;

/** Enlaces que salen de los datos del negocio; el dueño solo los ordena, renombra u oculta. */
export const HOME_BUILTIN_LINK_KINDS = ["menu", "whatsapp", "instagram", "location", "phone"] as const;
export type HomeBuiltinLinkKind = (typeof HOME_BUILTIN_LINK_KINDS)[number];
export type HomeLinkKind = HomeBuiltinLinkKind | "custom";

/** Íconos que el dueño puede elegir para un enlace propio ("auto" lo deduce del dominio). */
export const HOME_LINK_ICONS = [
	"auto",
	"link",
	"menu",
	"delivery",
	"reviews",
	"calendar",
	"gift",
	"mail",
	"phone",
	"location",
	"whatsapp",
	"instagram",
	"tiktok",
	"facebook",
	"youtube",
	"x",
] as const;
export type HomeLinkIcon = (typeof HOME_LINK_ICONS)[number];
export type ResolvedHomeLinkIcon = Exclude<HomeLinkIcon, "auto">;

export const HOME_SOCIAL_PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "x", "whatsapp", "email", "website"] as const;
export type HomeSocialPlatform = (typeof HOME_SOCIAL_PLATFORMS)[number];

export const HOME_BUTTON_STYLES = ["solid", "soft", "outline"] as const;
export type HomeButtonStyle = (typeof HOME_BUTTON_STYLES)[number];

export const HOME_BUTTON_SHAPES = ["pill", "rounded", "square"] as const;
export type HomeButtonShape = (typeof HOME_BUTTON_SHAPES)[number];

/**
 * Portada: la foto de fondo que ya subió para el menú, una foto propia para la
 * portada, un campo del color de marca o nada (solo logo y nombre).
 */
export const HOME_COVER_MODES = ["menu-image", "custom-image", "brand", "none"] as const;
export type HomeCoverMode = (typeof HOME_COVER_MODES)[number];

export type HomeLinkConfig = {
	/** Estable: el tipo para los integrados, `c_xxxx` para los propios. */
	id: string;
	kind: HomeLinkKind;
	enabled: boolean;
	/** Vacío = etiqueta por defecto (traducida) en los integrados. */
	label: string;
	/** Se pinta con el color de marca. */
	featured: boolean;
	/** Solo enlaces propios. */
	url: string;
	icon: HomeLinkIcon;
};

export type HomeSocialConfig = {
	platform: HomeSocialPlatform;
	url: string;
};

export type HomePageConfig = {
	bio: string;
	links: HomeLinkConfig[];
	socials: HomeSocialConfig[];
	buttonStyle: HomeButtonStyle;
	buttonShape: HomeButtonShape;
	coverMode: HomeCoverMode;
	/** Ruta en Storage (bucket de branding) de la foto propia de portada. */
	coverImagePath: string;
	/** Chip «Abierto ahora / Cerrado» según las cajas abiertas. */
	showStatus: boolean;
	/** Bloque de horario con el texto de business_info.schedule. */
	showSchedule: boolean;
	/** Tarjeta con QR hacia el menú (solo en pantallas anchas). */
	showQr: boolean;
};

export const HOME_BIO_MAX = 160;
export const HOME_LABEL_MAX = 48;
export const HOME_URL_MAX = 500;
export const HOME_CUSTOM_LINKS_MAX = 12;

const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

function clampText(value: unknown, max: number): string {
	// Una sola línea: los saltos se vuelven espacios y se colapsan.
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, max);
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
	const raw = String(value ?? "").trim();
	return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Deja pasar solo http(s), mailto y tel. Sin esquema y con pinta de dominio se
 * asume https. Todo lo demás (javascript:, data:, rutas relativas) sale vacío:
 * estas URLs terminan en un `href` de la página pública, que comparte origen
 * con /cuenta cuando el negocio se sirve por ruta (godcode.me/<slug>).
 */
export function sanitizeHomeUrl(raw: unknown): string {
	let value = String(raw ?? "").trim();
	if (!value || value.length > HOME_URL_MAX) return "";
	if (/\s/.test(value)) return "";
	if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
		// "instagram.com/local" o "www.local.cl": dominio sin esquema.
		if (!/^[^/]+\.[a-z]{2,}(?:[/?#]|$)/i.test(value)) return "";
		value = `https://${value}`;
	}
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return "";
	}
	if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return "";
	if ((parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.hostname.includes(".")) return "";
	if (parsed.protocol === "tel:" && !/^\+?[0-9]{5,20}$/.test(parsed.pathname.replace(/[\s().-]/g, ""))) return "";
	if (parsed.protocol === "mailto:" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(decodeURIComponent(parsed.pathname))) return "";
	return parsed.toString();
}

/**
 * Enlace de contacto de una sucursal (WhatsApp, Instagram, mapa) tal como
 * llega a la API: `undefined` = no tocar, `null` = borrar, o la URL web ya
 * normalizada. Cualquier otra cosa es un error que la API devuelve como 400.
 */
export function parseBranchContactUrlInput(
	raw: unknown,
): { ok: true; value: string | null | undefined } | { ok: false } {
	if (raw === undefined) return { ok: true, value: undefined };
	if (raw === null) return { ok: true, value: null };
	if (typeof raw !== "string") return { ok: false };
	const trimmed = raw.trim();
	if (!trimmed) return { ok: true, value: null };
	const safe = sanitizeHomeUrl(trimmed);
	if (!safe || !/^https?:/i.test(safe)) return { ok: false };
	return { ok: true, value: safe };
}

/** `tel:` desde un teléfono escrito a mano ("+56 9 1234 5678"). */
export function phoneToTelHref(raw: unknown): string {
	const digits = String(raw ?? "").replace(/[^\d+]/g, "");
	const normalized = digits.startsWith("+") ? `+${digits.slice(1).replace(/\+/g, "")}` : digits.replace(/\+/g, "");
	return /^\+?\d{5,20}$/.test(normalized) ? `tel:${normalized}` : "";
}

const HANDLE = /^@?([A-Za-z0-9._-]{1,60})$/;

/**
 * Convierte lo que escribe el dueño en la URL de la red: acepta la URL
 * completa, el dominio sin https o solo el usuario (@local).
 */
export function socialInputToUrl(platform: HomeSocialPlatform, raw: unknown): string {
	const value = String(raw ?? "").trim();
	if (!value) return "";
	/* Con @ siempre es un usuario ("@rica.pizza" lleva punto y es válido en
	   Instagram). Sin @, un texto con punto es un dominio (".pizza" existe). */
	const match = HANDLE.exec(value);
	const handle = match && (value.startsWith("@") || !value.includes(".")) ? match[1] : null;
	switch (platform) {
		case "instagram":
			return handle ? sanitizeHomeUrl(`https://instagram.com/${handle}`) : sanitizeHomeUrl(value);
		case "tiktok":
			return handle ? sanitizeHomeUrl(`https://www.tiktok.com/@${handle}`) : sanitizeHomeUrl(value);
		case "x":
			return handle ? sanitizeHomeUrl(`https://x.com/${handle}`) : sanitizeHomeUrl(value);
		case "youtube":
			return handle ? sanitizeHomeUrl(`https://www.youtube.com/@${handle}`) : sanitizeHomeUrl(value);
		case "facebook":
			return handle ? sanitizeHomeUrl(`https://facebook.com/${handle}`) : sanitizeHomeUrl(value);
		case "whatsapp": {
			const digits = value.replace(/[^\d]/g, "");
			if (!/^[a-z]/i.test(value) && digits.length >= 8 && digits.length <= 15) return `https://wa.me/${digits}`;
			return sanitizeHomeUrl(value);
		}
		case "email":
			return /^[^@\s:]+@[^@\s]+\.[^@\s]+$/.test(value) ? sanitizeHomeUrl(`mailto:${value}`) : sanitizeHomeUrl(value);
		case "website":
			return sanitizeHomeUrl(value);
	}
}

const HOST_ICON_RULES: Array<[RegExp, ResolvedHomeLinkIcon]> = [
	[/(^|\.)instagram\.com$/, "instagram"],
	[/(^|\.)tiktok\.com$/, "tiktok"],
	[/(^|\.)(facebook\.com|fb\.com|fb\.me|m\.me)$/, "facebook"],
	[/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
	[/(^|\.)(x\.com|twitter\.com)$/, "x"],
	[/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
	[/(^|\.)(waze\.com|maps\.app\.goo\.gl)$|^maps\.google\.|^goo\.gl$/, "location"],
	[/(^|\.)(rappi\.[a-z.]+|pedidosya\.[a-z.]+|ubereats\.com|didi-food\.com|didifood\.com|justo\.mx|ifood\.com\.br|glovoapp\.com)$/, "delivery"],
	[/(^|\.)(tripadvisor\.[a-z.]+|g\.page|yelp\.[a-z.]+)$|^search\.google\.com$/, "reviews"],
	[/(^|\.)(opentable\.[a-z.]+|resy\.com|covermanager\.com|thefork\.[a-z.]+|calendly\.com|tock\.com)$/, "calendar"],
];

/** Ícono de un enlace propio: el elegido, o el que sugiere su dominio. */
export function resolveHomeLinkIcon(icon: HomeLinkIcon, url: string): ResolvedHomeLinkIcon {
	if (icon !== "auto") return icon;
	const safe = sanitizeHomeUrl(url);
	if (!safe) return "link";
	const parsed = new URL(safe);
	if (parsed.protocol === "mailto:") return "mail";
	if (parsed.protocol === "tel:") return "phone";
	const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
	if (host.startsWith("google.") && parsed.pathname.startsWith("/maps")) return "location";
	for (const [pattern, match] of HOST_ICON_RULES) {
		if (pattern.test(host)) return match;
	}
	return "link";
}

function builtinLink(kind: HomeBuiltinLinkKind, enabled: boolean): HomeLinkConfig {
	return { id: kind, kind, enabled, label: "", featured: kind === "menu", url: "", icon: "auto" };
}

/**
 * Lo que ve un negocio que nunca abrió el editor: lo mismo que mostraba la
 * portada anterior (carta, WhatsApp, Instagram, ubicación y la primera línea
 * del horario como frase), ahora con el diseño nuevo.
 */
export function defaultHomePageConfig(legacy?: { schedule?: string | null }): HomePageConfig {
	const firstScheduleLine = String(legacy?.schedule ?? "").split("\n")[0] ?? "";
	return {
		bio: clampText(firstScheduleLine, HOME_BIO_MAX),
		links: [
			builtinLink("menu", true),
			builtinLink("whatsapp", true),
			builtinLink("instagram", true),
			builtinLink("location", true),
			builtinLink("phone", false),
		],
		socials: [],
		buttonStyle: "solid",
		buttonShape: "pill",
		coverMode: "menu-image",
		coverImagePath: "",
		showStatus: true,
		showSchedule: false,
		showQr: true,
	};
}

function normalizeLink(raw: unknown): HomeLinkConfig | null {
	const value = asRecord(raw);
	const kind = pick<HomeLinkKind>(value.kind, [...HOME_BUILTIN_LINK_KINDS, "custom"], "custom");
	const label = clampText(value.label, HOME_LABEL_MAX);
	const enabled = value.enabled !== false;
	const featured = value.featured === true;

	if (kind !== "custom") {
		return { id: kind, kind, enabled, label, featured, url: "", icon: "auto" };
	}

	const url = sanitizeHomeUrl(value.url);
	const rawId = String(value.id ?? "").trim();
	const id = /^c_[a-z0-9]{4,24}$/i.test(rawId) ? rawId : "";
	// Un enlace propio sin URL válida o sin nombre no se puede mostrar: se descarta.
	if (!url || !label || !id) return null;
	return { id, kind, enabled, label, featured, url, icon: pick(value.icon, HOME_LINK_ICONS, "auto") };
}

/**
 * Normaliza lo guardado (o lo que manda el editor). Garantiza cada enlace
 * integrado exactamente una vez, descarta lo inválido y respeta el orden.
 */
export function normalizeHomePageConfig(input: unknown, legacy?: { schedule?: string | null }): HomePageConfig {
	const defaults = defaultHomePageConfig(legacy);
	const hasStored = input && typeof input === "object" && !Array.isArray(input);
	if (!hasStored) return defaults;
	const value = asRecord(input);

	const seen = new Set<string>();
	const links: HomeLinkConfig[] = [];
	let customCount = 0;
	for (const entry of Array.isArray(value.links) ? value.links : []) {
		const link = normalizeLink(entry);
		if (!link || seen.has(link.id)) continue;
		if (link.kind === "custom") {
			if (customCount >= HOME_CUSTOM_LINKS_MAX) continue;
			customCount += 1;
		}
		seen.add(link.id);
		links.push(link);
	}
	// Un integrado que falte (config antigua o manipulada) vuelve al final, con su valor por defecto.
	for (const fallback of defaults.links) {
		if (!seen.has(fallback.id)) links.push(fallback);
	}

	const socials: HomeSocialConfig[] = [];
	const seenPlatforms = new Set<HomeSocialPlatform>();
	for (const entry of Array.isArray(value.socials) ? value.socials : []) {
		const record = asRecord(entry);
		const platform = pick<HomeSocialPlatform | "">(record.platform, HOME_SOCIAL_PLATFORMS, "");
		if (!platform || seenPlatforms.has(platform)) continue;
		const url = socialInputToUrl(platform, record.url);
		if (!url) continue;
		seenPlatforms.add(platform);
		socials.push({ platform, url });
	}

	const coverImagePath = String(value.coverImagePath ?? "").trim().slice(0, 300);
	const coverMode = pick(value.coverMode, HOME_COVER_MODES, defaults.coverMode);

	return {
		bio: typeof value.bio === "string" ? clampText(value.bio, HOME_BIO_MAX) : defaults.bio,
		links,
		socials,
		buttonStyle: pick(value.buttonStyle, HOME_BUTTON_STYLES, defaults.buttonStyle),
		buttonShape: pick(value.buttonShape, HOME_BUTTON_SHAPES, defaults.buttonShape),
		// Sin foto propia subida, "custom-image" no tiene qué mostrar.
		coverMode: coverMode === "custom-image" && !coverImagePath ? "menu-image" : coverMode,
		coverImagePath,
		showStatus: typeof value.showStatus === "boolean" ? value.showStatus : defaults.showStatus,
		showSchedule: typeof value.showSchedule === "boolean" ? value.showSchedule : defaults.showSchedule,
		showQr: typeof value.showQr === "boolean" ? value.showQr : defaults.showQr,
	};
}

/** Lee `theme_config` (objeto o JSON en texto) y devuelve la config normalizada. */
export function readHomePageConfig(themeConfig: unknown, legacy?: { schedule?: string | null }): HomePageConfig {
	return normalizeHomePageConfig(readThemeConfigObject(themeConfig)[HOME_PAGE_THEME_KEY], legacy);
}

/** Id para un enlace propio nuevo. */
export function createHomeLinkId(): string {
	const random =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
			: Math.random().toString(36).slice(2, 12);
	return `c_${random}`;
}
