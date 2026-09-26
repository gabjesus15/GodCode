/**
 * ¿Puede esta URL pasar por el optimizador de next/image?
 *
 * Refleja `images.remotePatterns` de next.config.ts: Storage de Supabase,
 * Cloudinary y Unsplash. Cualquier otra URL (branding heredado con enlaces
 * externos en `theme_config`) haría fallar a <Image>, así que se sirve tal cual
 * con `unoptimized`.
 */
export function canOptimizeRemoteImage(src: string | null | undefined): boolean {
	const value = String(src ?? "").trim();
	if (!value) return false;
	if (value.startsWith("/")) return !/\.svg($|\?)/i.test(value);

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return false;
	if (url.hostname === "res.cloudinary.com" || url.hostname === "images.unsplash.com") return true;

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
	if (!supabaseUrl) return false;
	try {
		const supabase = new URL(supabaseUrl);
		const basePath = supabase.pathname.replace(/\/$/, "");
		return url.host === supabase.host && url.pathname.startsWith(`${basePath}/storage/v1/object/`);
	} catch {
		return false;
	}
}
