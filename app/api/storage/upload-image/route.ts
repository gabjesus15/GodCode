import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { safeStorageFolder, validateImageFile } from "@/lib/storage/image-file";
import { STOREFRONT_BRANDING_BUCKET } from "@/lib/storage/storefront-branding";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

export const runtime = "nodejs";

const EXT_BY_TYPE = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);

const ADMIN_FOLDERS = new Set(["tenant", "landing"]);
const CUSTOMER_FOLDERS = new Set(["payment-reference"]);
const PUBLIC_FOLDERS = new Set(["onboarding", "receipts"]);

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
	} else {
		const limited = await assertPublicRateLimit(req, `storage_upload_${folder}`, 12, 60_000);
		if (limited) return limited;
	}

	const extension = EXT_BY_TYPE.get(file.type.toLowerCase());
	if (!extension) {
		return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG o WebP." }, { status: 400 });
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
