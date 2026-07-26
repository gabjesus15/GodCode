const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type ImageFileValidationResult = { valid: boolean; error?: string };

export function validateImageFile(file: File | null): ImageFileValidationResult {
	if (!file || !(file instanceof File)) {
		return { valid: false, error: "Archivo no valido." };
	}
	if (file.size > MAX_FILE_SIZE_BYTES) {
		return { valid: false, error: "La imagen es muy pesada (max. 5 MB)." };
	}
	const type = (file.type || "").toLowerCase();
	if (!ALLOWED_IMAGE_TYPES.includes(type)) {
		return { valid: false, error: "Solo se permiten imagenes JPG, PNG o WebP." };
	}
	return { valid: true };
}

export function safeStorageFolder(folder: string): string {
	const clean = (folder || "tenant").trim().replace(/[^a-zA-Z0-9/_-]/g, "");
	return clean || "tenant";
}
