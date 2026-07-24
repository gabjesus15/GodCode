import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import type {
  StoreThemeAssetField,
  StoreThemeConfig,
} from "@/components/customer-portal/shared/customer-account-types";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
  buildStorefrontBrandingFolder,
  createStorefrontAssetSignedUrl,
  isCompanyStorefrontAssetPath,
  STOREFRONT_BRANDING_BUCKET,
} from "@/lib/storage/storefront-branding";
import { isSameStoreTheme, normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function isAssetField(value: FormDataEntryValue | null | undefined): value is StoreThemeAssetField {
  return value === "logoUrl" || value === "backgroundImageUrl";
}

export async function POST(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const limited = await assertCustomerAccountRateLimit(
    ctx.companyId,
    "store_theme_asset_post",
    12,
    60_000,
  );
  if (limited) return limited;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const field = form?.get("field");
  if (!(file instanceof File) || !isAssetField(field)) {
    return NextResponse.json({ error: "Archivo o tipo de imagen invalido." }, { status: 400 });
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  const maxBytes = field === "logoUrl" ? 3 * 1024 * 1024 : 7 * 1024 * 1024;
  if (!extension) {
    return NextResponse.json({ error: "Usa una imagen JPG, PNG, WebP o GIF." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json(
      { error: `La imagen supera el maximo de ${field === "logoUrl" ? 3 : 7} MB.` },
      { status: 400 },
    );
  }

  const [
    { data: company, error: companyError },
    { data: draft, error: draftError },
    { data: versions, error: versionsError },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("companies")
        .select("theme_config")
        .eq("id", ctx.companyId)
        .maybeSingle(),
      supabaseAdmin
        .from("company_theme_drafts")
        .select("theme_config")
        .eq("company_id", ctx.companyId)
        .maybeSingle(),
      supabaseAdmin
        .from("company_theme_versions")
        .select("theme_config")
        .eq("company_id", ctx.companyId),
    ]);

  if (companyError || draftError || versionsError) {
    return NextResponse.json(
      {
        error:
          companyError?.message ||
          draftError?.message ||
          versionsError?.message ||
          "No se pudo leer el tema.",
      },
      { status: 500 },
    );
  }

  const published = normalizeStoreThemeConfig(company?.theme_config);
  const currentDraft = draft?.theme_config
    ? normalizeStoreThemeConfig(draft.theme_config)
    : published;
  const path = `${buildStorefrontBrandingFolder(ctx.companyId, field)}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STOREFRONT_BRANDING_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const nextTheme: StoreThemeConfig = { ...currentDraft, [field]: path };
  const nowIso = new Date().toISOString();
  const { error: persistError } = await supabaseAdmin
    .from("company_theme_drafts")
    .upsert(
      {
        company_id: ctx.companyId,
        theme_config: nextTheme,
        updated_by_email: ctx.email,
        updated_at: nowIso,
      },
      { onConflict: "company_id" },
    );

  if (persistError) {
    await supabaseAdmin.storage.from(STOREFRONT_BRANDING_BUCKET).remove([path]);
    return NextResponse.json({ error: persistError.message }, { status: 500 });
  }

  const previousPath = currentDraft[field];
  const previousIsPublished = previousPath === published[field];
  const previousIsVersioned = (versions ?? []).some(
    (version) => normalizeStoreThemeConfig(version.theme_config)[field] === previousPath,
  );
  if (
    previousPath !== path &&
    !previousIsPublished &&
    !previousIsVersioned &&
    isCompanyStorefrontAssetPath(previousPath, ctx.companyId)
  ) {
    // El borrador ya apunta a la imagen nueva. Un fallo al limpiar no invalida el guardado.
    await supabaseAdmin.storage.from(STOREFRONT_BRANDING_BUCKET).remove([previousPath]);
  }

  const signedUrl = await createStorefrontAssetSignedUrl(path, ctx.companyId);
  return NextResponse.json({
    ok: true,
    message: "Imagen guardada en el borrador.",
    path,
    signedUrl,
    draft: {
      theme: nextTheme,
      updatedAt: nowIso,
      updatedByEmail: ctx.email,
      hasUnpublishedChanges: !isSameStoreTheme(nextTheme, published),
    },
  });
}
