import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { getCloudinaryOptimizedUrl, isCloudinaryUrl } from "@/components/tenant/utils/cloudinary";

export function sanitizeHexColor(value: string | undefined, fallback: string): string {
	const normalized = String(value ?? "").trim();
	if (/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(normalized)) {
		return normalized;
	}
	return fallback;
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
	if (rawBackgroundImageUrl.startsWith("/")) return rawBackgroundImageUrl;
	if (isCloudinaryUrl(rawBackgroundImageUrl)) {
		return getCloudinaryOptimizedUrl(rawBackgroundImageUrl, {
			width: 2400,
			quality: "auto:good",
			crop: "limit",
		}) || rawBackgroundImageUrl;
	}
	return rawBackgroundImageUrl;
}

export function resolveThemeColors(theme: Partial<StoreThemeConfig>): ResolvedThemeColors {
	const primaryColor = sanitizeHexColor(theme.primaryColor, "#111827");
	const secondaryColor = sanitizeHexColor(theme.secondaryColor, primaryColor);
	const priceColor = sanitizeHexColor(theme.priceColor, "#ff4757");
	const discountColor = sanitizeHexColor(theme.discountColor, "#25d366");
	const hoverColor = sanitizeHexColor(theme.hoverColor, "#ff2e40");
	const backgroundColor = sanitizeHexColor(theme.backgroundColor, "#0a0a0a");
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
