import { randomUUID } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
  buildStorefrontBrandingFolder,
  createStorefrontAssetSignedUrl,
  STOREFRONT_BRANDING_BUCKET,
} from "@/lib/storage/storefront-branding";
import { mergeThemeConfig } from "@/lib/store-theme/merge-theme-config";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { normalizeBaseDomain } from "@/utils/tenant-url";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

type ThemePatchBody = {
  displayName?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  priceColor?: string;
  discountColor?: string;
  hoverColor?: string;
  logoUrl?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
};

type PutBody = {
  expectedUpdatedAt?: string | null;
  company?: {
    name?: string;
    legal_rut?: string;
    email?: string;
    phone?: string;
    address?: string;
    public_slug?: string;
    custom_domain?: string | null;
    plan_id?: string | null;
    subscription_status?: string;
    country?: string | null;
    currency?: string | null;
  };
  businessInfo?: {
    name?: string;
    phone?: string;
    address?: string;
    instagram?: string;
    schedule?: string;
    country?: string | null;
    currency?: string | null;
  };
  themePatch?: ThemePatchBody;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.error ?? "No autorizado" },
      { status: permission.status ?? 403 },
    );
  }

  const { id: companyId } = await context.params;
  if (!companyId) {
    return NextResponse.json({ error: "Falta company id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as PutBody;
  const expectedUpdatedAt = String(body.expectedUpdatedAt ?? "").trim() || null;

  const { data: fresh, error: freshError } = await supabaseAdmin
    .from("companies")
    .select("id,theme_config,updated_at,public_slug,subscription_ends_at,plan_id,custom_domain")
    .eq("id", companyId)
    .maybeSingle();

  if (freshError) {
    return NextResponse.json({ error: freshError.message }, { status: 500 });
  }
  if (!fresh) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  if (expectedUpdatedAt && String(fresh.updated_at ?? "") !== expectedUpdatedAt) {
    return NextResponse.json(
      {
        error:
          "La empresa fue actualizada por otro usuario. Recarga la pagina e intenta de nuevo.",
        code: "STALE_COMPANY",
      },
      { status: 409 },
    );
  }

  const companyInput = body.company ?? {};
  const planId = String(companyInput.plan_id ?? fresh.plan_id ?? "").trim() || null;

  let panelAccess: string[] = [];
  let planName = "";
  if (planId) {
    const { data: planRow } = await supabaseAdmin
      .from("plans")
      .select("id,name,features")
      .eq("id", planId)
      .maybeSingle();
    panelAccess = buildCompanyPanelAccessFromPlanFeatures(planRow?.features);
    planName = String(planRow?.name ?? "").toLowerCase();
  }

  const themeInput = body.themePatch ?? {};
  const themePatch: Record<string, unknown> = {
    displayName: String(themeInput.displayName ?? "").trim() || null,
    primaryColor: themeInput.primaryColor,
    secondaryColor: themeInput.secondaryColor,
    priceColor: themeInput.priceColor,
    discountColor: themeInput.discountColor,
    hoverColor: themeInput.hoverColor,
    logoUrl: themeInput.logoUrl,
    backgroundColor: themeInput.backgroundColor,
    backgroundImageUrl: String(themeInput.backgroundImageUrl ?? "").trim() || null,
    panelAccess,
  };

  const nextTheme = mergeThemeConfig(fresh.theme_config, themePatch);
  const nowIso = new Date().toISOString();

  const normalizedCustomDomain = normalizeBaseDomain(
    String(companyInput.custom_domain ?? fresh.custom_domain ?? ""),
  );
  const isDevPlan = planName.includes("dev");
  const isBetaPlan = planName.includes("beta");
  let nextSubscriptionEnds: string | null = fresh.subscription_ends_at ?? null;

  const companyUpdate: Record<string, unknown> = {
    name: String(companyInput.name ?? "").trim(),
    legal_rut: String(companyInput.legal_rut ?? "").trim(),
    email: String(companyInput.email ?? "").trim(),
    phone: String(companyInput.phone ?? "").trim(),
    address: String(companyInput.address ?? "").trim(),
    public_slug: String(companyInput.public_slug ?? "").trim(),
    custom_domain: normalizedCustomDomain || null,
    plan_id: planId,
    subscription_status: companyInput.subscription_status,
    country: companyInput.country || null,
    currency: companyInput.currency || null,
    theme_config: nextTheme,
    updated_at: nowIso,
  };

  if (isDevPlan) {
    companyUpdate.subscription_ends_at = null;
    nextSubscriptionEnds = null;
  } else if (isBetaPlan && !fresh.subscription_ends_at) {
    const betaEnd = addDays(new Date(), 30).toISOString();
    companyUpdate.subscription_ends_at = betaEnd;
    nextSubscriptionEnds = betaEnd;
  }

  companyUpdate.custom_domain_expires_at = normalizedCustomDomain ? nextSubscriptionEnds : null;

  const { error: companyError } = await supabaseAdmin
    .from("companies")
    .update(companyUpdate)
    .eq("id", companyId);

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  if (body.businessInfo && typeof body.businessInfo === "object") {
    const bi = body.businessInfo;
    const { error: businessError } = await supabaseAdmin.from("business_info").upsert(
      {
        company_id: companyId,
        name: String(bi.name ?? "").trim() || null,
        phone: String(bi.phone ?? "").trim() || null,
        address: String(bi.address ?? "").trim() || null,
        instagram: String(bi.instagram ?? "").trim() || null,
        schedule: String(bi.schedule ?? "").trim() || null,
        country: bi.country || null,
        currency: bi.currency || null,
        updated_at: nowIso,
      },
      { onConflict: "company_id" },
    );
    if (businessError) {
      return NextResponse.json({ error: businessError.message }, { status: 500 });
    }
  }

  const storeDraft = normalizeStoreThemeConfig(nextTheme);
  await supabaseAdmin.from("company_theme_drafts").upsert(
    {
      company_id: companyId,
      theme_config: storeDraft,
      updated_by_email: permission.email ?? "super-admin",
      updated_at: nowIso,
    },
    { onConflict: "company_id" },
  );

  const publicSlug = String(companyUpdate.public_slug ?? fresh.public_slug ?? "").trim();
  revalidateTag(`menu:${companyId}`, "max");
  if (publicSlug) {
    revalidateTag(`company-slug:${publicSlug}`, "max");
  }

  await logAdminAudit({
    actorEmail: permission.email ?? "",
    actorRole: permission.role,
    action: "company.update",
    resourceType: "company",
    resourceId: companyId,
    metadata: { via: "api.super-admin.companies.put" },
  });

  return NextResponse.json({
    ok: true,
    updatedAt: nowIso,
    theme_config: nextTheme,
    public_slug: publicSlug || null,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.error ?? "No autorizado" },
      { status: permission.status ?? 403 },
    );
  }

  const { id: companyId } = await context.params;
  if (!companyId) {
    return NextResponse.json({ error: "Falta company id" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const fieldRaw = String(form?.get("field") ?? "logoUrl");
  const field = fieldRaw === "backgroundImageUrl" ? "backgroundImageUrl" : "logoUrl";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo no valido." }, { status: 400 });
  }

  const EXT_BY_TYPE = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
  ]);
  const extension = EXT_BY_TYPE.get(file.type.toLowerCase());
  if (!extension) {
    return NextResponse.json({ error: "Solo JPG, PNG, WebP o GIF." }, { status: 400 });
  }

  const path = `${buildStorefrontBrandingFolder(companyId, field)}/${randomUUID()}.${extension}`;
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

  const signedUrl = await createStorefrontAssetSignedUrl(path, companyId);
  return NextResponse.json({ ok: true, path, signedUrl, field });
}
