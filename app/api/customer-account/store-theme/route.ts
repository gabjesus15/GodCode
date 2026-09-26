import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { applyStoreThemeDraftPatch, isSameStoreTheme, normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";

/** @service-role customer-account */

function toThemeConfig(input: unknown): StoreThemeConfig {
  return normalizeStoreThemeConfig(input);
}

export async function GET() {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limited = await assertCustomerAccountRateLimit(ctx.companyId, "store_theme_get", 40, 60_000);
  if (limited) return limited;

  const [{ data: company, error: companyError }, { data: draft, error: draftError }, { data: versions, error: versionsError }] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id,name,theme_config")
      .eq("id", ctx.companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("company_theme_drafts")
      .select("theme_config,updated_at,updated_by_email")
      .eq("company_id", ctx.companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("company_theme_versions")
      .select("id,theme_config,created_at,created_by_email")
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });
  if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 });
  if (versionsError) return NextResponse.json({ error: versionsError.message }, { status: 500 });

  const published = toThemeConfig(company?.theme_config ?? null);
  const draftTheme = draft?.theme_config ? toThemeConfig(draft.theme_config) : published;
  const [publishedLogo, publishedBackground, draftLogo, draftBackground] = await Promise.all([
    createStorefrontAssetSignedUrl(published.logoUrl, ctx.companyId),
    createStorefrontAssetSignedUrl(published.backgroundImageUrl, ctx.companyId),
    createStorefrontAssetSignedUrl(draftTheme.logoUrl, ctx.companyId),
    createStorefrontAssetSignedUrl(draftTheme.backgroundImageUrl, ctx.companyId),
  ]);

  return NextResponse.json({
    ok: true,
    company: {
      id: String(company?.id ?? ctx.companyId),
      name: String(company?.name ?? "Mi tienda"),
    },
    published,
    draft: {
      theme: draftTheme,
      updatedAt: draft?.updated_at ?? null,
      updatedByEmail: draft?.updated_by_email ?? null,
      hasUnpublishedChanges: !isSameStoreTheme(draftTheme, published),
    },
    versions: (versions ?? []).map((row) => ({
      id: String(row.id),
      theme: toThemeConfig(row.theme_config),
      createdAt: row.created_at,
      createdByEmail: row.created_by_email,
    })),
    assetUrls: {
      published: {
        logoUrl: publishedLogo || null,
        backgroundImageUrl: publishedBackground || null,
      },
      draft: {
        logoUrl: draftLogo || null,
        backgroundImageUrl: draftBackground || null,
      },
    },
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limited = await assertCustomerAccountRateLimit(ctx.companyId, "store_theme_put", 30, 60_000);
  if (limited) return limited;

  /**
   * `patch`: solo los campos que el dueño cambió, mezclados sobre el borrador guardado.
   * Así un cambio hecho mientras tanto por soporte (super admin) no se pierde cuando el
   * editor, que cargó el tema antes, guarda. `discard`: el borrador vuelve a lo publicado
   * en la base (no a la copia que tenía el navegador). `theme`: reemplazo completo.
   */
  const payload = (await req.json().catch(() => ({}))) as { theme?: unknown; patch?: unknown; discard?: boolean };
  const nowIso = new Date().toISOString();

  const [{ data: company, error: companyError }, { data: currentDraft, error: currentDraftError }] = await Promise.all([
    supabaseAdmin.from("companies").select("theme_config").eq("id", ctx.companyId).maybeSingle(),
    supabaseAdmin.from("company_theme_drafts").select("theme_config").eq("company_id", ctx.companyId).maybeSingle(),
  ]);

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }
  if (currentDraftError) {
    return NextResponse.json({ error: currentDraftError.message }, { status: 500 });
  }

  const published = toThemeConfig(company?.theme_config ?? null);
  let theme: StoreThemeConfig;
  if (payload.discard === true) {
    theme = published;
  } else if (payload.patch && typeof payload.patch === "object" && !Array.isArray(payload.patch)) {
    const base = currentDraft?.theme_config ? toThemeConfig(currentDraft.theme_config) : published;
    theme = applyStoreThemeDraftPatch(base, payload.patch);
  } else {
    theme = toThemeConfig(payload.theme);
  }
  const hasUnpublishedChanges = !isSameStoreTheme(theme, published);

  const { error } = await supabaseAdmin
    .from("company_theme_drafts")
    .upsert(
      {
        company_id: ctx.companyId,
        theme_config: theme,
        updated_by_email: ctx.email,
        updated_at: nowIso,
      },
      { onConflict: "company_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Borrador guardado.",
    published,
    draft: {
      theme,
      updatedAt: nowIso,
      updatedByEmail: ctx.email,
      hasUnpublishedChanges,
    },
  });
}
