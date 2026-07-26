import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";

export function sanitizeHexColor(value: string | undefined, fallback: string): string {
	const normalized = String(value ?? "").trim();
	if (/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(normalized)) {
		return normalized;
	}
	return fallback;
}

/** Normaliza #RGB / #RRGGBB a #rrggbb. */
function expandHex6(hex: string, fallback: string): string {
	const normalized = String(hex ?? "").trim();
	const short = /^#([a-fA-F0-9]{3})$/.exec(normalized);
	if (short) {
		return `#${short[1].split("").map((c) => c + c).join("").toLowerCase()}`;
	}
	const long = /^#([a-fA-F0-9]{6})$/.exec(normalized);
	if (long) return `#${long[1].toLowerCase()}`;
	return sanitizeHexColor(fallback, "#0a0a0a");
}

/**
 * Parsea hex / rgba / transparent a RGB + alpha.
 * Usado por el color de fondo (permite opacidad 0 = sin tint).
 */
export function parseThemeColor(
	value: string | undefined,
	fallbackHex = "#0a0a0a",
): { hex: string; alpha: number } {
	const raw = String(value ?? "").trim();
	const fallback = expandHex6(fallbackHex, "#0a0a0a");
	if (!raw) return { hex: fallback, alpha: 1 };

	if (raw.toLowerCase() === "transparent") {
		return { hex: fallback, alpha: 0 };
	}

	const rgba = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i.exec(raw);
	if (rgba) {
		const r = Math.min(255, Math.max(0, Number(rgba[1])));
		const g = Math.min(255, Math.max(0, Number(rgba[2])));
		const b = Math.min(255, Math.max(0, Number(rgba[3])));
		const alphaRaw = rgba[4] != null ? Number(rgba[4]) : 1;
		const alpha = Number.isFinite(alphaRaw) ? Math.min(1, Math.max(0, alphaRaw)) : 1;
		const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
		return { hex, alpha };
	}

	const hexMatch = /^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/.exec(raw);
	if (hexMatch) {
		let h = hexMatch[1];
		if (h.length === 3) h = h.split("").map((c) => c + c).join("");
		if (h.length === 8) {
			const alpha = Number.parseInt(h.slice(6, 8), 16) / 255;
			return {
				hex: `#${h.slice(0, 6).toLowerCase()}`,
				alpha: Number.isFinite(alpha) ? alpha : 1,
			};
		}
		return { hex: `#${h.toLowerCase()}`, alpha: 1 };
	}

	return { hex: fallback, alpha: 1 };
}

/** Serializa color de tema: hex sólido o `rgba(...)` (incluye alpha 0). */
export function formatThemeColor(hex: string, alpha: number): string {
	const a = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : 1));
	const solid = expandHex6(hex, "#0a0a0a");
	if (a >= 0.995) return solid;
	return hexToRgba(solid, Math.round(a * 1000) / 1000, solid);
}

export function sanitizeThemeBackgroundColor(
	value: string | undefined,
	fallback = "#0a0a0a",
): string {
	const parsed = parseThemeColor(value, fallback);
	return formatThemeColor(parsed.hex, parsed.alpha);
}

export function sanitizeThemeImageUrl(value: string | undefined): string {
	const normalized = String(value ?? "").trim();
	if (!normalized) return "";
	if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("/")) {
		return normalized;
	}
	return "";
}

export function sanitizeCssValue(value: string): string {
	return value.replace(/<|>|"|'|`/g, "").trim();
}

export function hexToRgba(hex: string, alpha: number, fallback: string): string {
	if (!hex) return fallback;
	const normalized = hex.trim();
	const shortMatch = /^#([a-fA-F0-9]{3})$/.exec(normalized);
	const longMatch = /^#([a-fA-F0-9]{6})$/.exec(normalized);
	const hexValue = shortMatch
		? shortMatch[1].split("").map((char) => char + char).join("")
		: longMatch
			? longMatch[1]
			: null;
	if (!hexValue) return fallback;
	const r = Number.parseInt(hexValue.slice(0, 2), 16);
	const g = Number.parseInt(hexValue.slice(2, 4), 16);
	const b = Number.parseInt(hexValue.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type ResolvedThemeColors = {
	primaryColor: string;
	secondaryColor: string;
	priceColor: string;
	discountColor: string;
	hoverColor: string;
	backgroundColor: string;
	backgroundImage: string;
	backgroundLayerOpacity: string;
	backgroundSize: string;
	backgroundRepeat: string;
	accentShadow: string;
	accentShadowStrong: string;
	cardBorder: string;
};

function resolveOptimizedBackgroundImageUrl(rawBackgroundImageUrl: string): string {
	return rawBackgroundImageUrl;
}

export function resolveThemeColors(theme: Partial<StoreThemeConfig>): ResolvedThemeColors {
	const primaryColor = sanitizeHexColor(theme.primaryColor, "#111827");
	const secondaryColor = sanitizeHexColor(theme.secondaryColor, primaryColor);
	const priceColor = sanitizeHexColor(theme.priceColor, "#ff4757");
	const discountColor = sanitizeHexColor(theme.discountColor, "#25d366");
	const hoverColor = sanitizeHexColor(theme.hoverColor, "#ff2e40");
	const backgroundColor = sanitizeThemeBackgroundColor(theme.backgroundColor, "#0a0a0a");
	const rawBackgroundImageUrl = sanitizeThemeImageUrl(theme.backgroundImageUrl);
	const optimizedBackground = rawBackgroundImageUrl
		? resolveOptimizedBackgroundImageUrl(rawBackgroundImageUrl)
		: "";
	const backgroundImage = optimizedBackground ? `url(${optimizedBackground})` : "none";
	const backgroundLayerOpacity = optimizedBackground ? "0.38" : "0";
	const backgroundSize = optimizedBackground ? "1200px" : "auto";
	const backgroundRepeat = optimizedBackground ? "repeat" : "repeat";
	return {
		primaryColor,
		secondaryColor,
		priceColor,
		discountColor,
		hoverColor,
		backgroundColor,
		backgroundImage,
		backgroundLayerOpacity,
		backgroundSize,
		backgroundRepeat,
		accentShadow: hexToRgba(primaryColor, 0.3, "rgba(255, 71, 87, 0.3)"),
		accentShadowStrong: hexToRgba(primaryColor, 0.5, "rgba(255, 71, 87, 0.5)"),
		cardBorder: hexToRgba(primaryColor, 0.18, "rgba(255, 255, 255, 0.1)"),
	};
}

export function buildTenantThemeCssString(theme: Partial<StoreThemeConfig>): string {
	const colors = resolveThemeColors(theme);
	return `html, body { background-color: ${sanitizeCssValue(colors.backgroundColor)} !important; } .tenant-theme-vars{--tenant-primary:${sanitizeCssValue(colors.primaryColor)};--accent-primary:${sanitizeCssValue(colors.primaryColor)};--accent-secondary:${sanitizeCssValue(colors.secondaryColor)};--price-color:${sanitizeCssValue(colors.priceColor)};--discount-color:${sanitizeCssValue(colors.discountColor)};--accent-hover:${sanitizeCssValue(colors.hoverColor)};--accent-shadow:${sanitizeCssValue(colors.accentShadow)};--accent-shadow-strong:${sanitizeCssValue(colors.accentShadowStrong)};--card-border:${sanitizeCssValue(colors.cardBorder)};--bg-primary:${sanitizeCssValue(colors.backgroundColor)};--tenant-bg-image:${sanitizeCssValue(colors.backgroundImage)};--tenant-bg-layer-opacity:${sanitizeCssValue(colors.backgroundLayerOpacity)};--tenant-bg-size:${sanitizeCssValue(colors.backgroundSize)};--tenant-bg-repeat:${sanitizeCssValue(colors.backgroundRepeat)};}`;
}

export const THEME_CSS_VAR_NAMES = [
	"--tenant-primary",
	"--accent-primary",
	"--accent-secondary",
	"--price-color",
	"--discount-color",
	"--accent-hover",
	"--accent-shadow",
	"--accent-shadow-strong",
	"--card-border",
	"--bg-primary",
	"--tenant-bg-image",
	"--tenant-bg-layer-opacity",
	"--tenant-bg-size",
	"--tenant-bg-repeat",
] as const;

export function themeColorsToCssVarEntries(theme: Partial<StoreThemeConfig>): Array<[string, string]> {
	const colors = resolveThemeColors(theme);
	return [
		["--tenant-primary", colors.primaryColor],
		["--accent-primary", colors.primaryColor],
		["--accent-secondary", colors.secondaryColor],
		["--price-color", colors.priceColor],
		["--discount-color", colors.discountColor],
		["--accent-hover", colors.hoverColor],
		["--accent-shadow", colors.accentShadow],
		["--accent-shadow-strong", colors.accentShadowStrong],
		["--card-border", colors.cardBorder],
		["--bg-primary", colors.backgroundColor],
		["--tenant-bg-image", colors.backgroundImage],
		["--tenant-bg-layer-opacity", colors.backgroundLayerOpacity],
		["--tenant-bg-size", colors.backgroundSize],
		["--tenant-bg-repeat", colors.backgroundRepeat],
	];
}

export function applyThemeCssVarsToRoot(theme: Partial<StoreThemeConfig>, root?: HTMLElement | null): () => void {
	const target = root ?? (typeof document !== "undefined" ? document.querySelector(".tenant-theme-vars") as HTMLElement | null : null);
	if (!target) return () => {};

	const entries = themeColorsToCssVarEntries(theme);
	const previousValues = entries.map(([name]) => [name, target.style.getPropertyValue(name)] as const);
	const colors = resolveThemeColors(theme);

	entries.forEach(([name, value]) => {
		target.style.setProperty(name, value);
	});

	if (typeof document !== "undefined") {
		document.documentElement.style.setProperty("background-color", colors.backgroundColor);
		document.body.style.setProperty("background-color", colors.backgroundColor);
	}

	return () => {
		previousValues.forEach(([name, value]) => {
			if (value) {
				target.style.setProperty(name, value);
			} else {
				target.style.removeProperty(name);
			}
		});
		if (typeof document !== "undefined") {
			document.documentElement.style.removeProperty("background-color");
			document.body.style.removeProperty("background-color");
		}
	};
}

const EMBEDDED_PREVIEW_STYLE_ID = "godcode-embedded-preview-theme";

/** Sobrescribe el `<style>` SSR del tenant en preview embebido (no revierte al tema publicado). */
export function applyEmbeddedPreviewThemeStyles(theme: Partial<StoreThemeConfig>): () => void {
	if (typeof document === "undefined") return () => {};

	let el = document.getElementById(EMBEDDED_PREVIEW_STYLE_ID) as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement("style");
		el.id = EMBEDDED_PREVIEW_STYLE_ID;
		document.head.appendChild(el);
	}

	const previous = el.textContent;
	el.textContent = buildTenantThemeCssString(theme);

	const colors = resolveThemeColors(theme);
	document.documentElement.style.setProperty("background-color", colors.backgroundColor, "important");
	document.body.style.setProperty("background-color", colors.backgroundColor, "important");

	return () => {
		el!.textContent = previous ?? "";
		document.documentElement.style.removeProperty("background-color");
		document.body.style.removeProperty("background-color");
	};
}
