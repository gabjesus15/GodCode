import "server-only";

import sharp from "sharp";

import { fetchTenantLogo } from "@/lib/tenant/favicon-icon";

/**
 * Insumos de la tarjeta que ven WhatsApp, Instagram, Facebook o iMessage al
 * pegar el enlace de un local. Todo falla en silencio: sin fuente o sin foto la
 * tarjeta se dibuja igual con lo que haya, nunca queda sin vista previa.
 */

const FONT_TIMEOUT_MS = 2500;

/**
 * TTF de Google Fonts recortado a `text` (Satori no lee woff2). Sin un
 * User-Agent de navegador, Google responde con `format('truetype')`.
 */
export async function loadGoogleFont(family: string, weight: string, text: string): Promise<ArrayBuffer | null> {
	const glyphs = Array.from(new Set(Array.from(text))).join("");
	if (!glyphs.trim()) return null;
	const cssUrl = `https://fonts.googleapis.com/css2?family=${family.trim().replace(/\s+/g, "+")}:wght@${weight}&text=${encodeURIComponent(glyphs)}`;
	try {
		const css = await fetch(cssUrl, { signal: AbortSignal.timeout(FONT_TIMEOUT_MS) }).then((res) => (res.ok ? res.text() : ""));
		const src = /src:\s*url\(([^)]+)\)\s*format\(['"](?:opentype|truetype)['"]\)/.exec(css)?.[1];
		if (!src) return null;
		const font = await fetch(src, { signal: AbortSignal.timeout(FONT_TIMEOUT_MS) });
		return font.ok ? await font.arrayBuffer() : null;
	} catch {
		return null;
	}
}

/**
 * Descarga una imagen del Storage del local y la deja lista para Satori: al
 * tamaño que se va a pintar (las portadas pesan megas) y en PNG/JPEG, que son
 * los formatos que entiende (un logo WebP o AVIF rompería la tarjeta).
 */
export async function loadShareImage(
	url: string | null | undefined,
	target: { width: number; height: number; kind: "photo" | "logo"; /** Fondo bajo un logo con transparencia. */ background?: string },
): Promise<string | null> {
	if (!url) return null;
	const fetched = await fetchTenantLogo(url);
	if (!fetched) return null;
	try {
		const pipeline = sharp(fetched.buf, { animated: false }).rotate();
		const out =
			target.kind === "photo"
				? await pipeline.resize(target.width, target.height, { fit: "cover", position: "centre" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
				: await pipeline
						.resize(target.width, target.height, { fit: "cover", position: "centre" })
						.flatten({ background: target.background ?? "#ffffff" })
						.png()
						.toBuffer();
		return `data:image/${target.kind === "photo" ? "jpeg" : "png"};base64,${out.toString("base64")}`;
	} catch {
		return null;
	}
}
