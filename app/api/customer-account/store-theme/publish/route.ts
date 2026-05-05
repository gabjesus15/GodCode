import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

function toThemeConfig(input: unknown) {
  const value = (input ?? {}) as Record<string, unknown>;
  return {
    displayName: String(value.displayName ?? ""),
    primaryColor: String(value.primaryColor ?? "#111827"),
    secondaryColor: String(value.secondaryColor ?? value.primaryColor ?? "#111827"),
    priceColor: String(value.priceColor ?? "#ff4757"),
    discountColor: String(value.discountColor ?? "#25d366"),
    hoverColor: String(value.hoverColor ?? "#ff2e40"),
    backgroundColor: String(value.backgroundColor ?? "#0a0a0a"),
    backgroundImageUrl: String(value.backgroundImageUrl ?? ""),
    logoUrl: String(value.logoUrl ?? ""),
  };
}

export async function POST(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as {
    comment?: string;
    changedFields?: string[];
  };
  const publishComment = String(payload.comment ?? "").trim();
  const changedFields = Array.isArray(payload.changedFields)
    ? payload.changedFields.map((field) => String(field).trim()).filter(Boolean)
    : [];

  const { data: draft, error: draftError } = await supabaseAdmin
    .from("company_theme_drafts")
    .select("theme_config")
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 });
  if (!draft?.theme_config) return NextResponse.json({ error: "No hay borrador para publicar." }, { status: 400 });

  const nowIso = new Date().toISOString();
  const theme = toThemeConfig(draft.theme_config);

  const { error: updateCompanyError } = await supabaseAdmin
    .from("companies")
    .update({
      theme_config: theme,
      updated_at: nowIso,
    })
    .eq("id", ctx.companyId);

  if (updateCompanyError) {
    return NextResponse.json({ error: updateCompanyError.message }, { status: 500 });
  }

  const { error: versionError } = await supabaseAdmin
    .from("company_theme_versions")
    .insert({
      company_id: ctx.companyId,
      theme_config: theme,
      created_by_email: ctx.email,
    });

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }

  await supabaseAdmin.from("saas_tickets").insert({
    company_id: ctx.companyId,
    created_by_email: ctx.email,
    source: "tenant",
    subject: "Publicacion de cambios de tienda",
    description: [
      "Se publicaron cambios de branding desde el panel de cuenta.",
      `Fecha: ${nowIso}`,
      changedFields.length > 0 ? `Campos modificados: ${changedFields.join(", ")}` : null,
      publishComment ? `Comentario: ${publishComment}` : null,
    ].join("\n"),
    category: "account",
    priority: "low",
    status: "resolved",
    last_message_at: nowIso,
    resolved_at: nowIso,
  });

  return NextResponse.json({ ok: true, message: "Cambios publicados correctamente." });
}
