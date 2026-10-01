import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { safeStorageFolder, validateImageFile } from "@/lib/storage/image-file";
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

export async function POST(req: NextRequest) {
	const form = await req.formData().catch(() => null);
	const file = form?.get("file");
	const rawFolder = String(form?.get("folder") ?? "tenant");
	const folder = safeStorageFolder(rawFolder).split("/")[0] ?? "tenant";

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

	let customerCompanyId: string | null = null;
	if (ADMIN_FOLDERS.has(folder)) {
		const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
		if (!permission.ok) {
			return NextResponse.json(
				{ error: permission.error || "No autorizado" },
				{ status: permission.status },
			);
		}
	} else if (CUSTOMER_FOLDERS.has(folder)) {
		const ctx = await getCustomerAccountContext();
		if (!ctx) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}
		customerCompanyId = ctx.companyId;
	} else {
		const limited = await assertPublicRateLimit(req, `storage_upload_${folder}`, 12, 60_000);
		if (limited) return limited;
	}

	const extension = EXT_BY_TYPE.get(file.type.toLowerCase());
	if (!extension) {
		return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG o WebP." }, { status: 400 });
	}

	if (PRIVATE_FOLDERS.has(folder)) {
		return uploadPrivateReceipt(file, folder, extension, customerCompanyId);
	}

	const path = `uploads/${folder}/${randomUUID()}.${extension}`;
	const bytes = new Uint8Array(await file.arrayBuffer());
	const { error: uploadError } = await supabaseAdmin.storage
		.from(STOREFRONT_BRANDING_BUCKET)
		.upload(path, bytes, {
			cacheControl: "31536000",
			contentType: file.type,
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
	file: File,
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

	const bytes = new Uint8Array(await file.arrayBuffer());
	const { error: uploadError } = await supabaseAdmin.storage
		.from(PRIVATE_RECEIPTS_BUCKET)
		.upload(path, bytes, {
			cacheControl: "3600",
			contentType: file.type,
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
