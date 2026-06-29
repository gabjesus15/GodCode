import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { type LandingMediaAssetRow } from "@/lib/landing/landing-media";
import {
	defaultLandingV3AssetsRows,
	LANDING_V3_CONFIG_TAG,
	mergeLandingV3AssetRows,
} from "@/lib/landing/v3-config";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";

function normalizeRow(input: Partial<LandingMediaAssetRow>): LandingMediaAssetRow | null {
  const key = String(input.key ?? "").trim();
  const src = String(input.src ?? "").trim();
  if (!key || !src) return null;
  return {
    key,
    src,
    alt: String(input.alt ?? "").trim(),
    label: String(input.label ?? "").trim() || null,
    sub: String(input.sub ?? "").trim() || null,
    sort_order: Number(input.sort_order ?? 0) || 0,
    is_active: input.is_active !== false,
  };
}

export async function GET() {
  const access = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const { data, error } = await supabaseAdmin
    .from("landing_media_assets")
    .select("key,src,alt,label,sub,sort_order,is_active")
    .like("key", "v3.%")
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = mergeLandingV3AssetRows((data ?? []) as LandingMediaAssetRow[]);

  return NextResponse.json({ rows });
}

export async function PUT(req: NextRequest) {
  const access = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error ?? "No autorizado" }, { status: access.status });
  }

  const body = await req.json().catch(() => ({ rows: [] as Partial<LandingMediaAssetRow>[] }));
  const rows: Partial<LandingMediaAssetRow>[] = Array.isArray(body.rows)
    ? (body.rows as Partial<LandingMediaAssetRow>[])
    : [];

  const normalized = rows
    .map((row) => normalizeRow(row))
    .filter((row): row is LandingMediaAssetRow => Boolean(row))
    .filter((row) => row.key.startsWith("v3."));

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No hay assets válidos de landing v3 para guardar" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("landing_media_assets")
    .upsert(
      normalized.map((row) => ({
        key: row.key,
        src: row.src,
        alt: row.alt ?? "",
        label: row.label,
        sub: row.sub,
        sort_order: row.sort_order ?? 0,
        is_active: row.is_active !== false,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "key" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidateTag(LANDING_V3_CONFIG_TAG, "max");

  return NextResponse.json({ ok: true, saved: normalized.length });
}
