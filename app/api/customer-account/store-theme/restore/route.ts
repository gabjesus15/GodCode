import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function POST(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limited = await assertCustomerAccountRateLimit(ctx.companyId, "store_theme_restore", 15, 60_000);
  if (limited) return limited;

  const payload = (await req.json().catch(() => ({}))) as { versionId?: string };
  const versionId = String(payload.versionId ?? "").trim();

  if (!versionId) {
    return NextResponse.json({ error: "Falta versionId" }, { status: 400 });
  }

  const { data: version, error: versionError } = await supabaseAdmin
    .from("company_theme_versions")
    .select("id,theme_config")
    .eq("id", versionId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 });
  if (!version?.id) return NextResponse.json({ error: "Version no encontrada" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const { error: draftError } = await supabaseAdmin
    .from("company_theme_drafts")
    .upsert(
      {
        company_id: ctx.companyId,
        theme_config: version.theme_config,
        updated_by_email: ctx.email,
        updated_at: nowIso,
      },
      { onConflict: "company_id" }
    );

  if (draftError) {
    return NextResponse.json({ error: draftError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Version cargada en borrador." });
}
