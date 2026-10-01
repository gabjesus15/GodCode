import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	MAX_FILE_SIZE_BYTES,
	safeStorageFolder,
	sniffImageType,
	validateImageFile,
} from "@/lib/storage/image-file";
import {
	PRIVATE_RECEIPTS_BUCKET,
	PRIVATE_RECEIPT_SIGNED_URL_TTL,
	paymentReferencePath,
	privateReceiptHref,
	storefrontReceiptPath,
} from "@/lib/storage/private-receipts";
import { STOREFRONT_BRANDING_BUCKET } from "@/lib/storage/storefront-branding";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin, customer-account, public
 *
 * Una postura por carpeta destino: tenant/landing exige super_admin, payment-reference exige CEO, onboarding/receipts es pública con rate limit.
 * Los comprobantes (payment-reference, receipts) van al bucket privado `receipts`, nunca al público `menu`.
 */

export const runtime = "nodejs";

const EXT_BY_TYPE = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);

const ADMIN_FOLDERS = new Set(["tenant", "landing"]);
const CUSTOMER_FOLDERS = new Set(["payment-reference"]);
const PUBLIC_FOLDERS = new Set(["onboarding", "receipts"]);
/** Comprobantes de pago: datos bancarios del cliente, nunca en un bucket público. */
const PRIVATE_FOLDERS = new Set(["payment-reference", "receipts"]);

function isAllowedFolder(folder: string): boolean {
	return ADMIN_FOLDERS.has(folder) || CUSTOMER_FOLDERS.has(folder) || PUBLIC_FOLDERS.has(folder);
}

/** Margen para los separadores y cabeceras del multipart sobre el tamaño máximo del archivo. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function folderFrom(value: unknown): string {
	return safeStorageFolder(String(value ?? "tenant")).split("/")[0] ?? "tenant";
}

type UploadAuth = { ok: true; customerCompanyId: string | null } | { ok: false; response: NextResponse };

/** Postura de la carpeta: se resuelve antes de leer el cuerpo siempre que la carpeta venga en la URL. */
async function authorizeFolder(req: NextRequest, folder: string): Promise<UploadAuth> {
	if (ADMIN_FOLDERS.has(folder)) {
		const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
		if (!permission.ok) {
			return {
				ok: false,
				response: NextResponse.json({ error: permission.error || "No autorizado" }, { status: permission.status }),
			};
		}
		return { ok: true, customerCompanyId: null };
	}
	if (CUSTOMER_FOLDERS.has(folder)) {
		const ctx = await getCustomerAccountContext();
		if (!ctx) return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
		return { ok: true, customerCompanyId: ctx.companyId };
	}
	const limited = await assertPublicRateLimit(req, `storage_upload_${folder}`, 12, 60_000);
	if (limited) return { ok: false, response: limited };
	return { ok: true, customerCompanyId: null };
}

export async function POST(req: NextRequest) {
	// `formData()` carga el cuerpo entero en memoria: antes de leerlo se descarta lo que
	// declara pesar más que el máximo (o no lo declara; fetch con FormData siempre lo manda).
	const declaredLength = Number(req.headers.get("content-length") ?? "");
	if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
		return NextResponse.json({ error: "Falta el tamaño de la subida." }, { status: 411 });
	}
	if (declaredLength > MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES) {
		return NextResponse.json({ error: "La imagen es muy pesada (max. 5 MB)." }, { status: 413 });
	}

	// La carpeta viaja en la URL para autorizar sin tocar el cuerpo. Un cliente viejo que
	// solo la manda en el formulario pasa primero por un rate limit por IP.
	const queryFolder = req.nextUrl.searchParams.get("folder");
	let auth: UploadAuth | null = null;
	if (queryFolder !== null) {
		const folder = folderFrom(queryFolder);
		if (!isAllowedFolder(folder)) {
			return NextResponse.json({ error: "Carpeta de subida no permitida." }, { status: 400 });
		}
		auth = await authorizeFolder(req, folder);
		if (!auth.ok) return auth.response;
	} else {
		const limited = await assertPublicRateLimit(req, "storage_upload_unscoped", 12, 60_000);
		if (limited) return limited;
	}

	const form = await req.formData().catch(() => null);
	const file = form?.get("file");
	const formFolder = form?.get("folder");
	const folder = folderFrom(queryFolder ?? formFolder);
	if (queryFolder !== null && formFolder != null && folderFrom(formFolder) !== folder) {
		return NextResponse.json({ error: "Carpeta de subida no permitida." }, { status: 400 });
	}

	if (!(file instanceof File)) {
		return NextResponse.json({ error: "Archivo no valido." }, { status: 400 });
	}
	if (!isAllowedFolder(folder)) {
		return NextResponse.json({ error: "Carpeta de subida no permitida." }, { status: 400 });
	}

	const validation = validateImageFile(file);
	if (!validation.valid) {
		return NextResponse.json({ error: validation.error }, { status: 400 });
	}

	if (!auth) {
		auth = await authorizeFolder(req, folder);
		if (!auth.ok) return auth.response;
	}
	const customerCompanyId = auth.customerCompanyId;

	// El tipo declarado lo elige el navegador (o quien arme la petición): se decide por
	// los primeros bytes, y con ese tipo se guarda el archivo.
	const bytes = new Uint8Array(await file.arrayBuffer());
	const contentType = sniffImageType(bytes);
	const extension = contentType ? EXT_BY_TYPE.get(contentType) : undefined;
	if (!contentType || !extension) {
		return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG o WebP." }, { status: 400 });
	}

	if (PRIVATE_FOLDERS.has(folder)) {
		return uploadPrivateReceipt(bytes, contentType, folder, extension, customerCompanyId);
	}

	const path = `uploads/${folder}/${randomUUID()}.${extension}`;
	const { error: uploadError } = await supabaseAdmin.storage
		.from(STOREFRONT_BRANDING_BUCKET)
		.upload(path, bytes, {
			cacheControl: "31536000",
			contentType,
			upsert: false,
		});

	if (uploadError) {
		return NextResponse.json({ error: uploadError.message }, { status: 500 });
	}

	const { data } = supabaseAdmin.storage.from(STOREFRONT_BRANDING_BUCKET).getPublicUrl(path);
	const url = String(data?.publicUrl ?? "").trim();
	if (!url) {
		await supabaseAdmin.storage.from(STOREFRONT_BRANDING_BUCKET).remove([path]);
		return NextResponse.json({ error: "No se pudo generar la URL publica." }, { status: 500 });
	}

	return NextResponse.json({ ok: true, url, path });
}

/**
 * Comprobante al bucket privado. `payment-reference` devuelve el enlace estable a
 * `/api/storage/receipt`, que es lo que se guarda en `payments_history` y abren el
 * portal y el super admin. `receipts` (checkout del menú) devuelve una URL firmada
 * corta: el checkout solo comprueba que la subida funcionó y no guarda el enlace.
 */
async function uploadPrivateReceipt(
	bytes: Uint8Array,
	contentType: string,
	folder: string,
	extension: string,
	customerCompanyId: string | null,
): Promise<NextResponse> {
	const fileId = randomUUID();
	const path = folder === "payment-reference"
		? paymentReferencePath(customerCompanyId ?? "", fileId, extension)
		: storefrontReceiptPath(fileId, extension);
	if (!path) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const { error: uploadError } = await supabaseAdmin.storage
		.from(PRIVATE_RECEIPTS_BUCKET)
		.upload(path, bytes, {
			cacheControl: "3600",
			contentType,
			upsert: false,
		});
	if (uploadError) {
		return NextResponse.json({ error: uploadError.message }, { status: 500 });
	}

	if (folder === "payment-reference") {
		return NextResponse.json({ ok: true, url: privateReceiptHref(path), path });
	}

	const { data, error: signError } = await supabaseAdmin.storage
		.from(PRIVATE_RECEIPTS_BUCKET)
		.createSignedUrl(path, PRIVATE_RECEIPT_SIGNED_URL_TTL);
	const url = String(data?.signedUrl ?? "").trim();
	if (signError || !url) {
		await supabaseAdmin.storage.from(PRIVATE_RECEIPTS_BUCKET).remove([path]);
		return NextResponse.json({ error: "No se pudo guardar el comprobante." }, { status: 500 });
	}
	return NextResponse.json({ ok: true, url, path });
}
