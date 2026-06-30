import { NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { sendOnboardingEmail } from "../../../../lib/onboarding/emails";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

type CompanyRow = {
  id: string;
  name: string;
  email: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
};

async function resolveCompanyPrimaryContact(companyId: string, fallbackName: string, fallbackEmail: string | null) {
  const { data: app } = await supabaseAdmin
    .from("onboarding_applications")
    .select("email,responsible_name,business_name")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    email: String(app?.email ?? fallbackEmail ?? "").trim(),
    responsibleName: String(app?.responsible_name ?? "Cliente"),
    businessName: String(app?.business_name ?? fallbackName),
  };
}

export async function POST() {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limited = await assertCustomerAccountRateLimit(ctx.companyId, "reactivate_post", 10, 60_000);
  if (limited) return limited;

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("id,name,email,subscription_status,subscription_ends_at")
    .eq("id", ctx.companyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const companyRow = company as CompanyRow | null;
  if (!companyRow?.id) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  const status = String(companyRow.subscription_status ?? "").trim().toLowerCase();
  const endsAt = companyRow.subscription_ends_at ? new Date(companyRow.subscription_ends_at).getTime() : null;
  if (status !== "cancelled" || endsAt == null || !Number.isFinite(endsAt) || endsAt <= Date.now()) {
    return NextResponse.json(
      { error: "Solo puedes reactivar una cancelacion programada y vigente." },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("companies")
    .update({
      subscription_status: "active",
      updated_at: nowIso,
    })
    .eq("id", ctx.companyId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("saas_tickets").insert({
    company_id: ctx.companyId,
    created_by_email: ctx.email,
    source: "tenant",
    subject: `Cancelacion revertida · ${companyRow.name}`,
    description: [
      `Empresa: ${companyRow.name}`,
      "Resultado: la cancelacion programada fue revertida y el plan queda activo.",
      `Vencimiento actual: ${companyRow.subscription_ends_at ?? "sin fecha"}`,
    ].join("\n"),
    category: "billing",
    priority: "medium",
    status: "resolved",
    last_message_at: nowIso,
    resolved_at: nowIso,
  });

  const contact = await resolveCompanyPrimaryContact(ctx.companyId, companyRow.name, companyRow.email);
  if (contact.email) {
    await sendOnboardingEmail({
      type: "status_reactivated",
      to: contact.email,
      from: process.env.RESEND_FROM ?? "noreply@example.com",
      apiKey: process.env.RESEND_API_KEY ?? "",
      responsibleName: contact.responsibleName,
      businessName: contact.businessName,
      panelUrl: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Tu plan volvió a estado activo. La cancelación programada fue revertida.",
    subscriptionStatus: "active",
    subscriptionEndsAt: companyRow.subscription_ends_at,
  });
}
