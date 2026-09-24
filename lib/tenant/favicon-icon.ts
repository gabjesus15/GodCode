import "server-only";

import { sanitizeHexColor } from "@/lib/store-theme/apply-theme-css-vars";

/**
 * Piezas comunes de las dos rutas de favicon del tenant (`/tenant-favicon` y
 * `/<slug>/tenant-favicon`). Ambas sirven, desde el dominio principal, un logo
 * que eligió el negocio o un SVG con sus iniciales, así que todo lo que viene
 * del tenant se valida aquí.
 */

/** Cabeceras para cualquier imagen servida desde nuestro origen con contenido del tenant. */
export const TENANT_ICON_SECURITY_HEADERS = {
	"X-Content-Type-Options": "nosniff",
	// Aunque alguien abra la URL directamente, no se ejecuta nada.
	"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
} as const;

const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/x-icon", "image/vnd.microsoft.icon"]);
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function escapeXml(value: string): string {
	return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

export function iconInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	return parts.slice(0, 2).map((part) => Array.from(part)[0]?.toUpperCase() ?? "").join("") || "GC";
}

/**
 * SVG de respaldo con las iniciales. El color y el nombre vienen del tema del
 * negocio: sin validar, un `primaryColor` como `"/><script>…` se ejecutaba en
 * nuestro dominio al abrir la URL.
 */
export function buildInitialsIconSvg(name: string, color: unknown, size = 96): string {
	const fill = sanitizeHexColor(typeof color === "string" ? color.trim() : "", "#111827");
	const fontSize = Math.round(size * 0.375);
	const radius = Math.round(size * 0.23);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${fill}"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(iconInitials(name))}</text></svg>`;
}

function isFetchableLogoUrl(raw: string): boolean {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return false;
	}
	// El Storage propio siempre vale (las URLs firmadas salen de ahí), sea cual sea su esquema.
	try {
		const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "");
		if (url.host === storage.host && url.pathname.startsWith("/storage/v1/object/")) return true;
	} catch {
		// Sin Supabase configurado solo cuentan las URLs públicas.
	}
	if (url.protocol !== "https:") return false;
	const host = url.hostname.toLowerCase();
	// Nada de la red interna: ni localhost, ni IPs literales, ni nombres sin dominio.
	if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
	if (/^[\d.]+$/.test(host) || host.includes(":") || !host.includes(".")) return false;
	return true;
}

/**
 * Descarga el logo para convertirlo en ícono. Solo https público, sin seguir
 * redirecciones, con tope de tamaño y solo imágenes de mapa de bits: un SVG o
 * un HTML ajeno nunca se sirve con nuestro origen.
 */
export async function fetchTenantLogo(logoUrl: string): Promise<{ buf: Buffer; contentType: string } | null> {
	if (!isFetchableLogoUrl(logoUrl)) return null;
	try {
		const upstream = await fetch(logoUrl, {
			cache: "no-store",
			redirect: "manual",
			signal: AbortSignal.timeout(8000),
			headers: {
				Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
				"User-Agent": "Gcode-TenantFavicon/1.0",
			},
		});
		if (!upstream.ok) return null;
		const contentType = (upstream.headers.get("content-type") || "").split(";")[0]?.trim().toLowerCase() ?? "";
		if (!RASTER_TYPES.has(contentType)) return null;
		const declared = Number(upstream.headers.get("content-length") ?? 0);
		if (declared > MAX_LOGO_BYTES) return null;
		const buf = Buffer.from(await upstream.arrayBuffer());
		if (buf.byteLength === 0 || buf.byteLength > MAX_LOGO_BYTES) return null;
		return { buf, contentType };
	} catch {
		return null;
	}
}
