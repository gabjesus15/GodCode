import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

type ThemeConfig = {
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  priceColor: string;
  discountColor: string;
  hoverColor: string;
  backgroundColor: string;
  backgroundImageUrl: string;
  logoUrl: string;
};

const DEFAULT_THEME: ThemeConfig = {
  displayName: "",
  primaryColor: "#111827",
  secondaryColor: "#111827",
  priceColor: "#ff4757",
  discountColor: "#25d366",
  hoverColor: "#ff2e40",
  backgroundColor: "#0a0a0a",
  backgroundImageUrl: "",
  logoUrl: "",
};

function toThemeConfig(input: unknown): ThemeConfig {
  const value = (input ?? {}) as Record<string, unknown>;
  return {
    displayName: String(value.displayName ?? DEFAULT_THEME.displayName),
    primaryColor: String(value.primaryColor ?? DEFAULT_THEME.primaryColor),
    secondaryColor: String(value.secondaryColor ?? value.primaryColor ?? DEFAULT_THEME.secondaryColor),
    priceColor: String(value.priceColor ?? DEFAULT_THEME.priceColor),
    discountColor: String(value.discountColor ?? DEFAULT_THEME.discountColor),
    hoverColor: String(value.hoverColor ?? DEFAULT_THEME.hoverColor),
    backgroundColor: String(value.backgroundColor ?? DEFAULT_THEME.backgroundColor),
    backgroundImageUrl: String(value.backgroundImageUrl ?? ""),
    logoUrl: String(value.logoUrl ?? ""),
  };
}

export async function GET() {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
      hasUnpublishedChanges: JSON.stringify(draftTheme) !== JSON.stringify(published),
    },
    versions: (versions ?? []).map((row) => ({
      id: String(row.id),
      theme: toThemeConfig(row.theme_config),
      createdAt: row.created_at,
      createdByEmail: row.created_by_email,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as { theme?: unknown };
  const theme = toThemeConfig(payload.theme);
  const nowIso = new Date().toISOString();

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("theme_config")
    .eq("id", ctx.companyId)
    .maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  const published = toThemeConfig(company?.theme_config ?? null);
  const hasUnpublishedChanges = JSON.stringify(theme) !== JSON.stringify(published);

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
    draft: {
      theme,
      updatedAt: nowIso,
      updatedByEmail: ctx.email,
      hasUnpublishedChanges,
    },
  });
}
