"use client";

import { ChevronLeft, Search } from "lucide-react";
import Image from "next/image";

import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import { STORE_THEME_FONTS, normalizeBackgroundMode, normalizeBrandNameColor, normalizeFontFamily } from "@/lib/store-theme/theme-config";
import { resolveSurfaceScheme } from "@/lib/tenant/theme/surface-scheme";
import type { StoreThemeConfig } from "../shared/customer-account-types";

/* Mismos valores que el cromo del menú (Menu.css, `--menu-chrome*`). */
const CHROME = {
	dark: { base: "#0a0a0a", glass: "rgba(12, 12, 14, 0.82)", ink: "#f5f5f7", line: "rgba(255, 255, 255, 0.08)" },
	light: { base: "#fffdfa", glass: "rgba(255, 253, 250, 0.86)", ink: "#1d1d1f", line: "rgba(0, 0, 0, 0.08)" },
} as const;

/** Con qué color se pinta el nombre según lo elegido: primario, hover o uno propio. */
export function resolveBrandNamePreviewColor(theme: Pick<StoreThemeConfig, "primaryColor" | "hoverColor" | "brandNameColor">): string {
	const chosen = normalizeBrandNameColor(theme.brandNameColor);
	if (chosen === "hover") return theme.hoverColor;
	return chosen || theme.primaryColor;
}

type Props = {
	theme: StoreThemeConfig;
	/** URL con la que ya se enseña el logo en el panel (firmada o local). */
	logoUrl?: string;
	backgroundImageUrl?: string;
};

/**
 * Cabecera del menú en miniatura: fondo del local, modo claro u oscuro y el
 * nombre con la tipografía y el color elegidos. Es lo que ve el cliente al
 * abrir el menú, así que es donde conviene juzgar la fuente.
 */
export function BrandNamePreview({ theme, logoUrl, backgroundImageUrl }: Props) {
	const font = STORE_THEME_FONTS.find((entry) => entry.id === normalizeFontFamily(theme.fontFamily)) ?? STORE_THEME_FONTS[0];
	const scheme = resolveSurfaceScheme(theme.backgroundColor, theme.surfaceScheme);
	const chrome = CHROME[scheme];
	const color = resolveBrandNamePreviewColor(theme);
	const name = theme.displayName.trim() || "Tu local";
	const showImage = Boolean(backgroundImageUrl) && normalizeBackgroundMode(theme.backgroundMode) !== "solid";

	return (
		<div
			className="relative overflow-hidden rounded-xl border border-[#e5e5ea]"
			style={{ background: `linear-gradient(${theme.backgroundColor}, ${theme.backgroundColor}), ${chrome.base}` }}
			aria-label={`Vista previa del nombre del local en ${font.label}`}
		>
			{showImage ? (
				<span
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-cover bg-center"
					style={{
						backgroundImage: `url("${backgroundImageUrl}")`,
						opacity: 0.55,
						filter: scheme === "light" ? "brightness(1.06) contrast(0.94) saturate(0.9)" : "brightness(0.46) contrast(1.05) saturate(0.97)",
					}}
				/>
			) : null}

			<div
				className="relative flex items-center gap-3 px-3 py-2.5"
				style={{ background: chrome.glass, color: chrome.ink, borderBottom: `1px solid ${chrome.line}` }}
			>
				<ChevronLeft className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
				<span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full" style={{ background: chrome.line }}>
					{logoUrl ? (
						<Image src={logoUrl} alt="" fill sizes="36px" className="object-cover" unoptimized={shouldUnoptimizeImageSrc(logoUrl)} />
					) : (
						<span className="flex h-full w-full items-center justify-center text-sm font-bold" style={{ color: theme.primaryColor }}>
							{name.slice(0, 1).toUpperCase()}
						</span>
					)}
				</span>
				<span
					className="min-w-0 flex-1 truncate text-[1.6rem] leading-tight"
					style={{ fontFamily: `var(${font.cssVar}), "${font.label}", ${font.generic}`, fontWeight: font.weight, color, letterSpacing: "-0.01em" }}
				>
					{name}
				</span>
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: chrome.line }}>
					<Search className="h-4 w-4 opacity-80" aria-hidden />
				</span>
			</div>

			{/* Dos píldoras de categoría para dar contexto de escala; no son interactivas. */}
			<div className="relative flex gap-2 px-3 py-2.5" aria-hidden>
				<span className="h-6 w-20 rounded-full" style={{ background: theme.primaryColor, opacity: 0.9 }} />
				<span className="h-6 w-16 rounded-full" style={{ background: chrome.ink, opacity: 0.12 }} />
				<span className="h-6 w-24 rounded-full" style={{ background: chrome.ink, opacity: 0.12 }} />
			</div>
		</div>
	);
}
