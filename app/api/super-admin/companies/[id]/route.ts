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
import { MAIN_DOMAIN_RESERVED_PATH_SEGMENTS } from "@/lib/tenant/reserved-path-segments";
import { slugify } from "@/utils/slugify";
import { normalizeBaseDomain } from "@/utils/tenant-url";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin */

type ThemePatchBody = Partial<Record<(typeof BRANDING_KEYS)[number], string | null>>;

type CompanyFields = {
  name?: string;
  legal_rut?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  public_slug?: string;
  custom_domain?: string | null;
  plan_id?: string | null;
  subscription_status?: string;
  country?: string | null;
  currency?: string | null;
};

type PutBody = {
  expectedUpdatedAt?: string | null;
  /** Solo se tocan las claves presentes: cada sección del detalle guarda lo suyo. */
  company?: CompanyFields;
  businessInfo?: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    instagram?: string | null;
    schedule?: string | null;
    country?: string | null;
    currency?: string | null;
  };
  themePatch?: ThemePatchBody;
};

/** Campos de marca que el super admin puede editar (mismos nombres que el tema de /cuenta). */
const BRANDING_KEYS = [
  "displayName",
  "primaryColor",
  "secondaryColor",
  "priceColor",
  "discountColor",
  "hoverColor",
  "backgroundColor",
  "logoUrl",
  "backgroundImageUrl",
] as const;

const SUBSCRIPTION_STATUS_VALUES = new Set(["active", "trial", "payment_pending", "cancelled", "suspended"]);

function has<T extends object>(obj: T | undefined, key: keyof T): boolean {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
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
    .select("id,name,theme_config,updated_at,public_slug,subscription_status,subscription_ends_at,plan_id,custom_domain")
    .eq("id", companyId)
    .maybeSingle();

  if (freshError) {
    return NextResponse.json({ error: "No se pudo leer la empresa." }, { status: 500 });
  }
  if (!fresh) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  if (expectedUpdatedAt && String(fresh.updated_at ?? "") !== expectedUpdatedAt) {
    return NextResponse.json(
      {
        error: "Alguien más cambió esta empresa mientras editabas. Recarga la página y vuelve a intentarlo.",
        code: "STALE_COMPANY",
      },
      { status: 409 },
    );
  }

  const input = body.company;
  const nowIso = new Date().toISOString();
  const companyUpdate: Record<string, unknown> = {};
  const changes: string[] = [];

  if (has(input, "name")) {
    const name = String(input?.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "El nombre no puede quedar vacío." }, { status: 400 });
    companyUpdate.name = name;
  }
  for (const key of ["legal_rut", "email", "phone", "address", "country", "currency"] as const) {
    if (has(input, key)) companyUpdate[key] = textOrNull(input?.[key]);
  }

  if (has(input, "public_slug")) {
    const slug = slugify(String(input?.public_slug ?? ""), { maxLength: 80 });
    if (!slug) return NextResponse.json({ error: "El subdominio no puede quedar vacío." }, { status: 400 });
    if (MAIN_DOMAIN_RESERVED_PATH_SEGMENTS.has(slug)) {
      return NextResponse.json({ error: `«${slug}» está reservado por la plataforma. Elige otro subdominio.` }, { status: 400 });
    }
    companyUpdate.public_slug = slug;
  }

  // Estado y fecha de fin que regirán tras este guardado (para el dominio propio).
  let nextEndsAt: string | null = fresh.subscription_ends_at ?? null;
  let nextPanelAccess: string[] | null = null;
  const planChanged = has(input, "plan_id") && (textOrNull(input?.plan_id) ?? null) !== (fresh.plan_id ?? null);

  if (planChanged) {
    const planId = textOrNull(input?.plan_id);
    companyUpdate.plan_id = planId;
    let planName = "";
    if (planId) {
      const { data: planRow } = await supabaseAdmin.from("plans").select("id,name,features").eq("id", planId).maybeSingle();
      if (!planRow) return NextResponse.json({ error: "Ese plan no existe." }, { status: 400 });
      nextPanelAccess = buildCompanyPanelAccessFromPlanFeatures(planRow.features);
      planName = String(planRow.name ?? "").toLowerCase();
    } else {
      nextPanelAccess = [];
    }
    // Planes internos: "dev" no vence; "beta" dura 30 días si no tenía fecha.
    if (planName.includes("dev")) {
      companyUpdate.subscription_ends_at = null;
      nextEndsAt = null;
    } else if (planName.includes("beta") && !fresh.subscription_ends_at) {
      nextEndsAt = addDays(new Date(), 30).toISOString();
      companyUpdate.subscription_ends_at = nextEndsAt;
    }
    changes.push("plan");
  }

  if (has(input, "subscription_status")) {
    const status = String(input?.subscription_status ?? "").trim().toLowerCase();
    if (!SUBSCRIPTION_STATUS_VALUES.has(status)) {
      return NextResponse.json({ error: "Estado de suscripción no válido." }, { status: 400 });
    }
    // Activar una suscripción vencida no sirve: el cron la vuelve a suspender enseguida.
    const endsAtMs = nextEndsAt ? new Date(nextEndsAt).getTime() : null;
    if (status === "active" && status !== fresh.subscription_status && endsAtMs != null && endsAtMs <= Date.now()) {
      return NextResponse.json(
        { error: "La suscripción ya venció. Extiéndela en «Extender suscripción» y quedará activa." },
        { status: 409 },
      );
    }
    companyUpdate.subscription_status = status;
    changes.push("status");
  }

  if (has(input, "custom_domain")) {
    // Vacío = sin dominio propio (antes no se podía quitar: el servidor volvía al anterior).
    const domain = normalizeBaseDomain(String(input?.custom_domain ?? ""));
    companyUpdate.custom_domain = domain || null;
    companyUpdate.custom_domain_expires_at = domain ? nextEndsAt : null;
  } else if (has(companyUpdate, "subscription_ends_at") && fresh.custom_domain) {
    companyUpdate.custom_domain_expires_at = nextEndsAt;
  }

  // Marca: solo las claves que llegan, con el valor tal cual (antes una clave ausente se
  // guardaba como `undefined` y desaparecía del tema).
  const themeInput = body.themePatch;
  const brandingPatch: Record<string, unknown> = {};
  if (themeInput) {
    for (const key of BRANDING_KEYS) {
      if (!has(themeInput, key)) continue;
      const value = themeInput[key];
      brandingPatch[key] = key === "displayName" || key === "backgroundImageUrl" || key === "logoUrl" ? textOrNull(value) : value;
    }
  }
  const themePatch: Record<string, unknown> = { ...brandingPatch, ...(nextPanelAccess ? { panelAccess: nextPanelAccess } : {}) };
  if (Object.keys(themePatch).length > 0) {
    companyUpdate.theme_config = mergeThemeConfig(fresh.theme_config, themePatch);
  }
  if (Object.keys(brandingPatch).length > 0) changes.push("branding");

  if (Object.keys(companyUpdate).length > 0) {
    companyUpdate.updated_at = nowIso;
    const { error: companyError } = await supabaseAdmin.from("companies").update(companyUpdate).eq("id", companyId);
    if (companyError) {
      if (companyError.code === "23505") {
        return NextResponse.json({ error: "Ese subdominio o dominio ya lo usa otra empresa." }, { status: 409 });
      }
      return NextResponse.json({ error: "No se pudieron guardar los cambios." }, { status: 500 });
    }
  }

  if (planChanged) {
    // El super admin fija el plan a mano: un cambio que el dueño tenía programado ya no aplica.
    await supabaseAdmin
      .from("company_plan_change_schedules")
      .update({ status: "cancelled", updated_at: nowIso })
      .eq("company_id", companyId)
      .eq("status", "scheduled");
  }

  // La marca también va al borrador de /cuenta, pero sin pisar el resto del borrador del
  // dueño (antes cada guardado aquí le borraba los cambios que no había publicado).
  if (Object.keys(brandingPatch).length > 0) {
    // Es una publicación: queda en el historial de /cuenta, así el dueño la ve y puede volver atrás.
    await supabaseAdmin.from("company_theme_versions").insert({
      company_id: companyId,
      theme_config: normalizeStoreThemeConfig(companyUpdate.theme_config),
      created_by_email: permission.email ?? "super-admin",
    });

    const { data: draft } = await supabaseAdmin
      .from("company_theme_drafts")
      .select("theme_config")
      .eq("company_id", companyId)
      .maybeSingle();
    if (draft) {
      await supabaseAdmin
        .from("company_theme_drafts")
        .update({
          theme_config: mergeThemeConfig(draft.theme_config, brandingPatch),
          updated_by_email: permission.email ?? "super-admin",
          updated_at: nowIso,
        })
        .eq("company_id", companyId);
    }
  }

  if (body.businessInfo && typeof body.businessInfo === "object") {
    const bi = body.businessInfo;
    // Solo las columnas que llegan: el resto de la fila (p. ej. país y moneda) no se toca.
    const businessRow: Record<string, unknown> = { company_id: companyId, updated_at: nowIso };
    for (const key of ["name", "phone", "address", "instagram", "schedule", "country", "currency"] as const) {
      if (has(bi, key)) businessRow[key] = textOrNull(bi[key]);
    }
    const { error: businessError } = await supabaseAdmin
      .from("business_info")
      .upsert(businessRow, { onConflict: "company_id" });
    if (businessError) {
      return NextResponse.json({ error: "No se pudo guardar la información pública." }, { status: 500 });
    }
    changes.push("business_info");
  }

  const publicSlug = String(companyUpdate.public_slug ?? fresh.public_slug ?? "").trim();
  revalidateTag(`menu:${companyId}`, "max");
  if (publicSlug) revalidateTag(`company-slug:${publicSlug}`, "max");
  if (fresh.public_slug && fresh.public_slug !== publicSlug) revalidateTag(`company-slug:${fresh.public_slug}`, "max");

  await logAdminAudit({
    actorEmail: permission.email ?? "",
    actorRole: permission.role,
    action: "company.update",
    resourceType: "company",
    resourceId: companyId,
    companyId,
    metadata: { via: "api.super-admin.companies.put", sections: changes, fields: Object.keys(companyUpdate) },
  });

  const { data: updated } = await supabaseAdmin
    .from("companies")
    .select("id,name,legal_rut,email,phone,address,public_slug,custom_domain,plan_id,subscription_status,subscription_ends_at,updated_at,country,currency")
    .eq("id", companyId)
    .maybeSingle();

  return NextResponse.json({ ok: true, updatedAt: updated?.updated_at ?? nowIso, company: updated ?? null });
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
