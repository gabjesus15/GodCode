import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	buildStorefrontBrandingFolder,
	createStorefrontAssetSignedUrl,
	isCompanyStorefrontAssetPath,
	STOREFRONT_BRANDING_BUCKET,
} from "@/lib/storage/storefront-branding";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { readHomePageConfig } from "@/lib/tenant/home-page/home-page-config";

/** @service-role customer-account
 *
 * Sube la foto propia de portada. No la publica: devuelve la ruta y el editor
 * la guarda junto con el resto de la página al pulsar «Guardar».
 */

const ALLOWED_IMAGE_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);
const MAX_BYTES = 7 * 1024 * 1024;

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "home_cover_post", 12, 60_000);
	if (limited) return limited;

	const form = await req.formData().catch(() => null);
	const file = form?.get("file");
	if (!(file instanceof File)) {
		return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
	}
	const extension = ALLOWED_IMAGE_TYPES.get(file.type);
	if (!extension) {
		return NextResponse.json({ error: "Usa una imagen JPG, PNG o WebP." }, { status: 400 });
	}
	if (file.size <= 0 || file.size > MAX_BYTES) {
		return NextResponse.json({ error: "La imagen supera el máximo de 7 MB." }, { status: 400 });
	}

	const path = `${buildStorefrontBrandingFolder(ctx.companyId, "homeCover")}/${randomUUID()}.${extension}`;
	const { error: uploadError } = await supabaseAdmin.storage.from(STOREFRONT_BRANDING_BUCKET).upload(path, file, {
		cacheControl: "31536000",
		contentType: file.type,
		upsert: false,
	});
	if (uploadError) {
		return NextResponse.json({ error: uploadError.message }, { status: 500 });
	}

	// Si en esta misma edición ya había subido otra foto sin guardarla, esa sobra.
	const replaced = String(form?.get("replaces") ?? "").trim();
	if (replaced && isCompanyStorefrontAssetPath(replaced, ctx.companyId) && replaced.includes("/home-cover/")) {
		const { data: company } = await supabaseAdmin
			.from("companies")
			.select("theme_config")
			.eq("id", ctx.companyId)
			.maybeSingle();
		if (readHomePageConfig(company?.theme_config).coverImagePath !== replaced) {
			await supabaseAdmin.storage.from(STOREFRONT_BRANDING_BUCKET).remove([replaced]);
		}
	}

	const signedUrl = await createStorefrontAssetSignedUrl(path, ctx.companyId);
	return NextResponse.json({ ok: true, path, signedUrl });
}
