/** Cloudinary legacy: cloud deshabilitado / no usar en storefront. */
export function isCloudinaryImageUrl(value: string | null | undefined): boolean {
	const raw = String(value ?? "").trim();
	if (!raw) return false;
	return /res\.cloudinary\.com/i.test(raw);
}
