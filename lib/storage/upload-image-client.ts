import { validateImageFile } from "@/lib/storage/image-file";

/**
 * Sube una imagen al Storage de Supabase vía API interna.
 */
export async function uploadImage(file: File, folder = "tenant"): Promise<string> {
	const validation = validateImageFile(file);
	if (!validation.valid) throw new Error(validation.error);

	const formData = new FormData();
	formData.append("file", file);
	formData.append("folder", folder);

	let response: Response;
	try {
		response = await fetch("/api/storage/upload-image", {
			method: "POST",
			body: formData,
		});
	} catch {
		throw new Error("No se pudo conectar con el almacenamiento. Revisa tu conexion.");
	}

	const payload = (await response.json().catch(() => ({}))) as {
		error?: string;
		url?: string;
	};

	if (!response.ok) {
		throw new Error(payload.error || "No se pudo subir la imagen.");
	}

	const url = String(payload.url ?? "").trim();
	if (!url) throw new Error("El almacenamiento no devolvio una URL publica.");
	return url;
}

export { validateImageFile } from "@/lib/storage/image-file";
