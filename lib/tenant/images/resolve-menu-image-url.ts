const MENU_STORAGE_BUCKET = "menu";
const CLOUDINARY_HOST = "res.cloudinary.com";

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function resolveMenuImageUrl(
	value: string | null | undefined,
	supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
	const rawValue = value?.trim();
	if (!rawValue) return null;

	if (/^https?:\/\//i.test(rawValue)) {
		if (!isHttpUrl(rawValue)) return null;
		const hostname = new URL(rawValue).hostname.toLowerCase();
		if (hostname === CLOUDINARY_HOST || hostname.endsWith(`.${CLOUDINARY_HOST}`)) return null;
		return rawValue;
	}

	// Reject non-HTTP schemes instead of treating them as Storage object paths.
	if (/^[a-z][a-z\d+.-]*:/i.test(rawValue)) return null;

	const rawBaseUrl = supabaseUrl?.trim().replace(/\/+$/, "");
	if (!rawBaseUrl || !isHttpUrl(rawBaseUrl)) return null;

	const pathSegments = rawValue.replace(/^\/+|\/+$/g, "").split("/");
	if (
		pathSegments.length === 0 ||
		pathSegments.some((segment) => !segment || segment === "." || segment === "..")
	) {
		return null;
	}

	const objectPath = pathSegments.map(encodeURIComponent).join("/");
	return `${rawBaseUrl}/storage/v1/object/public/${MENU_STORAGE_BUCKET}/${objectPath}`;
}
