import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { parseThemeColor } from "@/lib/store-theme/apply-theme-css-vars";
import { STORE_THEME_FONTS, normalizeBackgroundMode, normalizeBrandNameColor, normalizeFontFamily } from "@/lib/store-theme/theme-config";
import { resolveSurfaceScheme } from "@/lib/tenant/theme/surface-scheme";

import {
	phoneToTelHref,
	resolveHomeLinkIcon,
	sanitizeHomeUrl,
	type HomeBuiltinLinkKind,
	type HomeButtonShape,
	type HomeButtonStyle,
	type HomePageConfig,
	type HomeSocialPlatform,
	type ResolvedHomeLinkIcon,
} from "./home-page-config";

/**
 * Convierte la config guardada + los datos vivos del negocio (sucursales,
 * cajas abiertas, horario) en lo que pinta la página. Puro y serializable: lo
 * usan el servidor de la página pública y la vista previa del editor, así que
 * lo que ve el dueño al editar es exactamente lo que verá el cliente.
 */

export type HomeContactChannel = Exclude<HomeBuiltinLinkKind, "menu">;

export type HomeBranchInput = {
	id: string;
	name: string | null;
	whatsapp_url?: string | null;
	instagram_url?: string | null;
	map_url?: string | null;
	phone?: string | null;
};

export type HomeContactTarget = {
	branchId: string;
	branchName: string;
	href: string;
	/** null cuando no se sabe (vista previa sin datos de caja). */
	isOpen: boolean | null;
};

type HomeViewLinkBase = {
	id: string;
	/** null = etiqueta por defecto del tipo (la traduce la vista). */
	label: string | null;
	icon: ResolvedHomeLinkIcon;
	featured: boolean;
};

export type HomeViewLink =
	| (HomeViewLinkBase & { type: "menu" })
	| (HomeViewLinkBase & { type: "href"; kind: HomeContactChannel | "custom"; href: string })
	| (HomeViewLinkBase & { type: "branches"; kind: HomeContactChannel; targets: HomeContactTarget[] });

export type HomeCover = { kind: "image"; url: string } | { kind: "brand" } | { kind: "none" };

/**
 * Colores y tipografía ya resueltos. La vista los aplica como variables en su
 * propio nodo, así funciona igual en la página pública y dentro del editor de
 * /cuenta, donde no existe el bloque `.tenant-theme-vars`.
 */
export type HomeViewBrand = {
	accent: string;
	/** Segundo tono, más luminoso, para el brillo de la portada de color. */
	glow: string;
	/** Tinta legible sobre el acento (blanco o casi negro). */
	onAccent: string;
	/** Color del nombre; null = tinta del esquema. */
	nameColor: string | null;
	nameFont: string;
	nameWeight: string;
	/**
	 * Color liso del fondo del menú cuando el local lo usa en modo sólido: en
	 * escritorio es el telón detrás de la hoja, así la portada y la carta se
	 * sienten del mismo lugar. null = telón neutro del esquema.
	 */
	page: string | null;
};

export type HomeViewModel = {
	name: string;
	initials: string;
	logoUrl: string | null;
	bio: string;
	cover: HomeCover;
	scheme: "light" | "dark";
	brand: HomeViewBrand;
	buttonStyle: HomeButtonStyle;
	buttonShape: HomeButtonShape;
	/** null = no mostrar el chip. */
	status: { open: number; total: number } | null;
	/** Líneas del horario; vacío = no mostrar el bloque. */
	schedule: string[];
	socials: Array<{ platform: HomeSocialPlatform; href: string }>;
	links: HomeViewLink[];
	showQr: boolean;
};

export type HomeThemeInput = Pick<
	StoreThemeConfig,
	"primaryColor" | "hoverColor" | "backgroundColor" | "surfaceScheme" | "backgroundMode" | "brandNameColor" | "fontFamily"
>;

export type ResolveHomePageInput = {
	config: HomePageConfig;
	theme: HomeThemeInput;
	name: string;
	logoUrl: string | null;
	/** Foto de fondo del menú (URL firmada) para la portada "menu-image". */
	menuImageUrl: string | null;
	/** Foto propia de portada (URL firmada) para "custom-image". */
	customCoverUrl: string | null;
	branches: HomeBranchInput[];
	/** null = estado de caja desconocido: no se muestra el chip ni el estado por sucursal. */
	openBranchIds: string[] | null;
	schedule: string | null;
};

const CHANNEL_ICON: Record<HomeContactChannel, ResolvedHomeLinkIcon> = {
	whatsapp: "whatsapp",
	instagram: "instagram",
	location: "location",
	phone: "phone",
};

function channelHref(channel: HomeContactChannel, branch: HomeBranchInput): string {
	switch (channel) {
		case "whatsapp":
			return sanitizeHomeUrl(branch.whatsapp_url);
		case "instagram":
			return sanitizeHomeUrl(branch.instagram_url);
		case "location":
			return sanitizeHomeUrl(branch.map_url);
		case "phone":
			return phoneToTelHref(branch.phone);
	}
}

export function homeInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "G";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}

function resolveCover(input: ResolveHomePageInput): HomeCover {
	const { config } = input;
	if (config.coverMode === "none") return { kind: "none" };
	if (config.coverMode === "brand") return { kind: "brand" };
	if (config.coverMode === "custom-image" && input.customCoverUrl) {
		return { kind: "image", url: input.customCoverUrl };
	}
	// Con el menú en fondo liso la foto del menú está apagada: no se rescata aquí.
	if (input.menuImageUrl && normalizeBackgroundMode(input.theme.backgroundMode) !== "solid") {
		return { kind: "image", url: input.menuImageUrl };
	}
	// Sin foto disponible, la portada cae al color de marca: nunca un hueco gris.
	return { kind: "brand" };
}

function channelLuminance(value: number): number {
	const n = value / 255;
	return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
	return (
		0.2126 * channelLuminance(Number.parseInt(hex.slice(1, 3), 16)) +
		0.7152 * channelLuminance(Number.parseInt(hex.slice(3, 5), 16)) +
		0.0722 * channelLuminance(Number.parseInt(hex.slice(5, 7), 16))
	);
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** Lienzo de cada esquema (tiene que coincidir con home-page.css). */
const SCHEME_CANVAS = { light: "#f2f2f2", dark: "#111113" } as const;
const INK_ON_LIGHT_ACCENT = "#141414";

function hexToRgb(hex: string): [number, number, number] {
	return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];
}

/** Mezcla lineal de dos hex (`amount` = cuánto de `b`). */
function mixHex(a: string, b: string, amount: number): string {
	const [ra, ga, ba] = hexToRgb(a);
	const [rb, gb, bb] = hexToRgb(b);
	const mix = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
	return `#${mix(ra, rb)}${mix(ga, gb)}${mix(ba, bb)}`;
}

function rgba(hex: string, alpha: number): string {
	const [r, g, b] = hexToRgb(hex);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Relleno de la portada sin foto: el acento con un brillo de su segundo tono
 * arriba a la izquierda y profundidad abajo a la derecha. Lo usan la página y
 * la miniatura del editor, así las dos muestran lo mismo.
 */
export function brandCoverFill(accent: string, glow: string): string {
	const deep = mixHex(accent, "#000000", 0.38);
	return [
		`radial-gradient(120% 150% at 6% -12%, ${rgba(glow, 0.95)} 0%, ${rgba(glow, 0)} 58%)`,
		`radial-gradient(95% 130% at 104% 112%, ${rgba(deep, 0.9)} 0%, ${rgba(deep, 0)} 64%)`,
		`linear-gradient(160deg, ${accent} 0%, ${mixHex(accent, "#000000", 0.2)} 100%)`,
	].join(", ");
}

function resolveBrand(theme: HomeThemeInput, scheme: "light" | "dark"): HomeViewBrand {
	const accent = parseThemeColor(theme.primaryColor, "#e63946").hex;
	// El hover del local suele ser su tono más vivo; si es más oscuro que el
	// primario (o no hay), el brillo sale del mismo acento aclarado.
	const hover = parseThemeColor(theme.hoverColor, accent).hex;
	const glow = luminance(hover) > luminance(accent) ? hover : mixHex(accent, "#ffffff", 0.28);
	const background = parseThemeColor(theme.backgroundColor, "#000000");
	const page = normalizeBackgroundMode(theme.backgroundMode) === "solid" && background.alpha >= 0.95 ? background.hex : null;
	const onAccent = contrast(accent, "#ffffff") >= contrast(accent, INK_ON_LIGHT_ACCENT) ? "#ffffff" : INK_ON_LIGHT_ACCENT;

	// Mismo criterio que la cabecera del menú: vacío = primario, "hover" = hover, o un hex propio.
	const chosen = normalizeBrandNameColor(theme.brandNameColor);
	const candidate =
		chosen === "hover" ? parseThemeColor(theme.hoverColor, accent).hex : chosen.startsWith("#") ? chosen : accent;
	// Un nombre que no se lee sobre el lienzo (negro en oscuro, amarillo en claro) cede a la tinta.
	const nameColor = contrast(candidate, SCHEME_CANVAS[scheme]) >= 3 ? candidate : null;

	const font = STORE_THEME_FONTS.find((entry) => entry.id === normalizeFontFamily(theme.fontFamily)) ?? STORE_THEME_FONTS[0];
	return {
		accent,
		glow,
		onAccent,
		nameColor,
		nameFont: `var(${font.cssVar}), "${font.label}", ${font.generic}`,
		nameWeight: font.weight,
		page,
	};
}

export function resolveHomePage(input: ResolveHomePageInput): HomeViewModel {
	const { config, branches } = input;
	const openSet = input.openBranchIds ? new Set(input.openBranchIds.map(String)) : null;

	const links: HomeViewLink[] = [];
	for (const link of config.links) {
		if (!link.enabled) continue;
		const label = link.label.trim() || null;

		if (link.kind === "menu") {
			links.push({ id: link.id, type: "menu", label, icon: "menu", featured: link.featured });
			continue;
		}

		if (link.kind === "custom") {
			const href = sanitizeHomeUrl(link.url);
			if (!href || !label) continue;
			links.push({
				id: link.id,
				type: "href",
				kind: "custom",
				label,
				href,
				icon: resolveHomeLinkIcon(link.icon, href),
				featured: link.featured,
			});
			continue;
		}

		const channel = link.kind;
		const targets: HomeContactTarget[] = [];
		for (const branch of branches) {
			const href = channelHref(channel, branch);
			if (!href) continue;
			targets.push({
				branchId: String(branch.id),
				branchName: (branch.name ?? "").trim(),
				href,
				isOpen: openSet ? openSet.has(String(branch.id)) : null,
			});
		}
		// Sin datos en ninguna sucursal el botón no se muestra: nunca un enlace muerto.
		if (targets.length === 0) continue;

		const base = { id: link.id, label, icon: CHANNEL_ICON[channel], featured: link.featured };
		if (targets.length === 1) {
			links.push({ ...base, type: "href", kind: channel, href: targets[0].href });
		} else {
			links.push({ ...base, type: "branches", kind: channel, targets });
		}
	}

	const scheduleLines = String(input.schedule ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 14);

	const scheme = resolveSurfaceScheme(input.theme.backgroundColor, input.theme.surfaceScheme);

	return {
		name: input.name,
		initials: homeInitials(input.name),
		logoUrl: input.logoUrl || null,
		bio: config.bio,
		cover: resolveCover(input),
		scheme,
		brand: resolveBrand(input.theme, scheme),
		buttonStyle: config.buttonStyle,
		buttonShape: config.buttonShape,
		status:
			config.showStatus && openSet && branches.length > 0
				? { open: branches.filter((branch) => openSet.has(String(branch.id))).length, total: branches.length }
				: null,
		schedule: config.showSchedule ? scheduleLines : [],
		socials: config.socials.map((social) => ({ platform: social.platform, href: social.url })),
		links,
		showQr: config.showQr,
	};
}
