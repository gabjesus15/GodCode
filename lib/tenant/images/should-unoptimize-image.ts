/**
 * Casos donde next/image no debe transformar (blob local, SVG estático, GIF emoji externo).
 * Cloudinary legacy: servir original (sin optimizer) aunque el host esté en remotePatterns.
 */
export function shouldUnoptimizeImageSrc(src: string | null | undefined): boolean {
	const value = String(src ?? "").trim();
	if (!value) return true;
	if (value.startsWith("blob:") || value.startsWith("data:")) return true;
	if (value.startsWith("/") && /\.svg($|\?)/i.test(value)) return true;
	if (/fonts\.gstatic\.com/i.test(value)) return true;
	if (/res\.cloudinary\.com/i.test(value)) return true;
	return false;
}
