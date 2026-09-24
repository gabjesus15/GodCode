import { ImageResponse } from "next/og";
import sharp from "sharp";

import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { readThemeConfigObject } from "@/lib/store-theme/merge-theme-config";
import { STORE_THEME_FONTS, normalizeFontFamily } from "@/lib/store-theme/theme-config";
import { loadHomeBrandInput } from "@/lib/tenant/home-page/load-home-page";
import { brandCoverFill, resolveHomePage, type HomeViewModel } from "@/lib/tenant/home-page/resolve-home-page";
import { formatBusinessNameFromSlug } from "@/lib/tenant/seo-metadata";
import { SHARE_IMAGE_SIZE } from "@/lib/tenant/share-card/share-image-metadata";
import { loadGoogleFont, loadShareImage } from "@/lib/tenant/share-card/share-card-assets";
import { getCachedCompany } from "@/utils/tenant-cache";

export const runtime = "nodejs";

/**
 * Tarjeta de vista previa del enlace (og:image) de la home y del menú: una
 * miniatura de la página de inicio del local, con su portada, su logo, su
 * nombre en su tipografía y el botón «Ver el menú» en su color.
 *
 * Satori (ImageResponse) ignora `className`: solo estilos en línea, y todo
 * <div> con más de un hijo lleva `display: flex`.
 */

const { width: W, height: H } = SHARE_IMAGE_SIZE;
const COVER_H = 262;
const SHEET_TOP = 236;
const LOGO = 176;
const RING = 8;
const RADIUS = 30;

const SCHEME = {
	light: { canvas: "#f2f2f2", surface: "#ffffff", fg: "#151515", fg2: "rgba(21, 21, 21, 0.68)" },
	dark: { canvas: "#111113", surface: "#1c1c1f", fg: "#f5f4f2", fg2: "rgba(245, 244, 242, 0.72)" },
} as const;

const SUBTITLE_FALLBACK = "Menú digital · Pedidos online";
const CTA = "Ver el menú";

// Una semana en la CDN: la URL lleva la versión de la marca, así que un logo
// nuevo cambia la URL y no hace falta esperar a que caduque.
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

/**
 * Satori entrega PNG; con una foto de portada pesa 200-400 KB y WhatsApp deja
 * sin imagen las vistas previas pesadas. En JPEG queda en ~60-120 KB.
 */
async function toJpegResponse(image: ImageResponse, cacheControl: string): Promise<Response> {
	const png = Buffer.from(await image.arrayBuffer());
	try {
		const jpeg = await sharp(png).flatten({ background: "#ffffff" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
		return new Response(new Uint8Array(jpeg), {
			headers: { "Content-Type": "image/jpeg", "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" },
		});
	} catch {
		return new Response(new Uint8Array(png), {
			headers: { "Content-Type": "image/png", "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" },
		});
	}
}

function nameFontSize(name: string): number {
	const length = Array.from(name).length;
	if (length <= 12) return 78;
	if (length <= 18) return 68;
	if (length <= 26) return 56;
	return 46;
}

function clampLine(text: string, max: number): string {
	const clean = text.replace(/\s+/g, " ").trim();
	return Array.from(clean).length > max ? `${Array.from(clean).slice(0, max - 1).join("").trimEnd()}…` : clean;
}

function ctaRadius(shape: HomeViewModel["buttonShape"]): number {
	return shape === "pill" ? 999 : shape === "rounded" ? 18 : 8;
}

export async function GET(_request: Request, { params }: { params: Promise<{ subdomain: string }> }) {
	const { subdomain } = await params;
	const found = await getCachedCompany(subdomain);
	// Una tienda suspendida o vencida no publica su marca (igual que el favicon y el manifest).
	const company = found && isTenantSubscriptionAccessible(found) ? found : null;

	if (!company) {
		const name = formatBusinessNameFromSlug(subdomain) || "Menú digital";
		return toJpegResponse(
			new ImageResponse(
				(
					<div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: SCHEME.dark.canvas, color: SCHEME.dark.fg, fontSize: 72, fontWeight: 700 }}>
						{name}
					</div>
				),
				SHARE_IMAGE_SIZE,
			),
			"public, max-age=300, s-maxage=600",
		);
	}

	const model = resolveHomePage(await loadHomeBrandInput(company, subdomain));
	const palette = SCHEME[model.scheme];
	const subtitle = model.bio ? clampLine(model.bio, 64) : SUBTITLE_FALLBACK;
	const brandFont = STORE_THEME_FONTS.find((font) => font.id === normalizeFontFamily(readThemeConfigObject(company.theme_config).fontFamily)) ?? STORE_THEME_FONTS[0];
	const coverUrl = model.cover.kind === "image" ? model.cover.url : null;

	const [cover, logo, nameFont, uiRegular, uiBold] = await Promise.all([
		loadShareImage(coverUrl, { width: W, height: COVER_H, kind: "photo" }),
		loadShareImage(model.logoUrl, { width: LOGO * 2, height: LOGO * 2, kind: "logo", background: palette.surface }),
		loadGoogleFont(brandFont.label, brandFont.weight, model.name),
		loadGoogleFont("Montserrat", "500", subtitle),
		loadGoogleFont("Montserrat", "700", `${CTA}${model.initials}`),
	]);

	const fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 500 | 700; style: "normal" }> = [];
	if (nameFont) fonts.push({ name: "Brand", data: nameFont, weight: Number(brandFont.weight) === 700 ? 700 : 400, style: "normal" });
	if (uiRegular) fonts.push({ name: "Ui", data: uiRegular, weight: 500, style: "normal" });
	if (uiBold) fonts.push({ name: "Ui", data: uiBold, weight: 700, style: "normal" });
	const uiFamily = uiRegular || uiBold ? "Ui" : undefined;
	const hasCover = model.cover.kind !== "none";

	const card = new ImageResponse(
		(
			<div style={{ position: "relative", display: "flex", width: "100%", height: "100%", background: palette.canvas }}>
				{/* Portada: la foto del local o su color de marca, como en la home. */}
				{hasCover ? (
					<div style={{ position: "absolute", top: 0, left: 0, width: W, height: COVER_H, display: "flex", backgroundImage: brandCoverFill(model.brand.accent, model.brand.glow) }}>
						{cover ? <img src={cover} alt="" width={W} height={COVER_H} style={{ width: W, height: COVER_H, objectFit: "cover" }} /> : null}
					</div>
				) : (
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: W,
							height: 360,
							display: "flex",
							backgroundImage: `radial-gradient(circle at 50% 0%, ${model.brand.accent}33 0%, ${model.brand.accent}00 70%)`,
						}}
					/>
				)}

				{/* Hoja con las esquinas de arriba redondeadas, montada sobre la portada. */}
				<div
					style={{
						position: "absolute",
						top: hasCover ? SHEET_TOP : 0,
						left: 0,
						width: W,
						height: hasCover ? H - SHEET_TOP : H,
						display: "flex",
						background: palette.canvas,
						borderTopLeftRadius: hasCover ? RADIUS : 0,
						borderTopRightRadius: hasCover ? RADIUS : 0,
					}}
				/>

				<div
					style={{
						position: "absolute",
						top: hasCover ? SHEET_TOP - LOGO / 2 - RING : 70,
						left: 0,
						width: W,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: LOGO + RING * 2,
							height: LOGO + RING * 2,
							borderRadius: 999,
							background: palette.canvas,
						}}
					>
						{logo ? (
							<img src={logo} alt="" width={LOGO} height={LOGO} style={{ width: LOGO, height: LOGO, borderRadius: 999, objectFit: "cover" }} />
						) : (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									width: LOGO,
									height: LOGO,
									borderRadius: 999,
									background: model.brand.accent,
									color: model.brand.onAccent,
									fontSize: 64,
									fontWeight: 700,
									fontFamily: uiFamily,
								}}
							>
								{model.initials}
							</div>
						)}
					</div>

					<div
						style={{
							display: "flex",
							marginTop: 16,
							maxWidth: 1040,
							textAlign: "center",
							justifyContent: "center",
							fontFamily: nameFont ? "Brand" : uiFamily,
							fontWeight: nameFont ? (Number(brandFont.weight) === 700 ? 700 : 400) : 700,
							fontSize: nameFontSize(model.name),
							lineHeight: 1.05,
							letterSpacing: -0.5,
							color: model.brand.nameColor ?? palette.fg,
						}}
					>
						{model.name}
					</div>

					<div style={{ display: "flex", marginTop: 12, fontFamily: uiFamily, fontWeight: 500, fontSize: 29, color: palette.fg2 }}>{subtitle}</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							marginTop: 28,
							padding: "16px 30px 16px 36px",
							borderRadius: ctaRadius(model.buttonShape),
							background: model.brand.accent,
							color: model.brand.onAccent,
							fontFamily: uiFamily,
							fontWeight: 700,
							fontSize: 28,
							boxShadow: `0 14px 30px -14px ${model.brand.accent}`,
						}}
					>
						{CTA}
						<svg width="26" height="26" viewBox="0 0 24 24" style={{ marginLeft: 14 }}>
							<path d="M9 5l7 7-7 7" fill="none" stroke={model.brand.onAccent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</div>
				</div>
			</div>
		),
		{ ...SHARE_IMAGE_SIZE, fonts },
	);
	return toJpegResponse(card, CACHE_CONTROL);
}

