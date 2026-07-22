import {
	uploadImage as uploadImageShared,
	validateImageFile as validateImageFileShared,
} from "./cloudinary-upload";

export const validateImageFile = (file: File | null) => validateImageFileShared(file);
export const uploadImage = (file: File, folder = "tenant") => uploadImageShared(file, folder);

export function isCloudinaryUrl(url: string | null | undefined): boolean {
	if (!url) return false;
	try {
		const absoluteUrl = url.startsWith("//") ? `https:${url}` : url;
		const parsed = new URL(absoluteUrl);
		return parsed.hostname === "res.cloudinary.com" || parsed.hostname.endsWith(".res.cloudinary.com");
	} catch {
		return false;
	}
}

const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/";
const TRANSFORM_HINT = /(?:^|,)(w_|h_|c_|q_|f_|g_)/;

export const getCloudinaryOptimizedUrl = (
	url: string | null,
	options?: {
		width?: number;
		height?: number;
		quality?: string;
		format?: string;
		crop?: string;
		gravity?: string;
		background?: string;
	},
) => {
	if (!url || !isCloudinaryUrl(url)) return url;

	const [base, query] = url.split("?");
	const markerIndex = base.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
	if (markerIndex === -1) return url;

	const prefix = base.slice(0, markerIndex + CLOUDINARY_UPLOAD_SEGMENT.length);
	const rest = base.slice(markerIndex + CLOUDINARY_UPLOAD_SEGMENT.length);
	const firstSegment = rest.split("/")[0] ?? "";
	if (TRANSFORM_HINT.test(firstSegment) || firstSegment.includes(",")) return url;

	const width = options?.width ?? 600;
	const height = options?.height;
	const crop = options?.crop ?? "fill";
	const quality = options?.quality ?? "auto";
	const format = options?.format ?? "auto";
	const gravity = options?.gravity;
	const background = options?.background;
	const transformParts = [`f_${format}`, `q_${quality}`];
	if (width) transformParts.push(`w_${width}`);
	if (height) transformParts.push(`h_${height}`);
	if (crop) transformParts.push(`c_${crop}`);
	if (gravity) transformParts.push(`g_${gravity}`);
	if (background) transformParts.push(`b_${background}`);

	const finalUrl = `${prefix}${transformParts.join(",")}/${rest}`;
	return query ? `${finalUrl}?${query}` : finalUrl;
};
