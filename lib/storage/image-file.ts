const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

/**
 * Tipo real de la imagen según su firma (magic bytes), o null si no es JPG, PNG ni WebP.
 * `File.type` lo declara el cliente y no prueba nada sobre el contenido.
 */
export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}
	const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (bytes.length >= png.length && png.every((byte, i) => bytes[i] === byte)) {
		return "image/png";
	}
	const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
	if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
		return "image/webp";
	}
	return null;
}
