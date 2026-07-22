const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type ValidationResult = { valid: boolean; error?: string };

function safeFolder(folder: string): string {
	const clean = (folder || "tenant").trim().replace(/[^a-zA-Z0-9/_-]/g, "");
	return clean || "tenant";
}

function getCloudinaryUploadErrorMessage(raw: unknown): string {
	if (!raw || typeof raw !== "object") {
		return "Error uploading to Cloudinary";
	}
	const msg = String((raw as { error?: { message?: unknown } }).error?.message ?? "").trim();
	if (!msg) return "Error uploading to Cloudinary";

	const lower = msg.toLowerCase();
	if (lower.includes("preset") && lower.includes("not found")) {
		return "Configuracion de Cloudinary: el Upload Preset no existe. Revisa .env (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) y crea un preset unsigned.";
	}
	if (lower.includes("unsigned") && lower.includes("preset")) {
		return "Configuracion de Cloudinary: el preset debe ser unsigned para subidas desde cliente.";
	}
	return msg;
}

export function validateImageFile(file: File | null): ValidationResult {
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

export async function uploadImage(file: File, folder = "tenant"): Promise<string> {
	if (!CLOUD_NAME || !UPLOAD_PRESET) {
		throw new Error(
			"Cloudinary configuration is missing in .env (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET).",
		);
	}

	const validation = validateImageFile(file);
	if (!validation.valid) throw new Error(validation.error);

	const formData = new FormData();
	formData.append("file", file);
	formData.append("upload_preset", UPLOAD_PRESET);
	formData.append("folder", safeFolder(folder));

	let response: Response;
	try {
		response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
			method: "POST",
			body: formData,
		});
	} catch {
		throw new Error("No se pudo conectar con Cloudinary. Revisa conexion, firewall o bloqueadores de red.");
	}

	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}
	if (!response.ok) throw new Error(getCloudinaryUploadErrorMessage(payload));

	const secureUrl = String((payload as { secure_url?: unknown })?.secure_url ?? "").trim();
	if (!secureUrl) throw new Error("Cloudinary no devolvio secure_url.");
	return secureUrl;
}
