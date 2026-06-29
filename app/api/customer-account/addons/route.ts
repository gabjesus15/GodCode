import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { normalizeCountryCode } from "@/lib/geo/country-registry";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

type CompanyRow = {
  id: string;
  name: string;
  country: string | null;
  plan_id: string | null;
  subscription_ends_at: string | null;
};

type AddonRow = {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  description: string | null;
  price_one_time: number | null;
  price_monthly: number | null;
  is_active: boolean | null;
};

type PlanRow = {
  id: string;
  name: string;
  max_branches: number | null;
  max_users: number | null;
  features: unknown;
  marketing_lines: unknown;
};

type MethodSnapshot = {
  id: string;
  slug: string;
  name: string;
  countries: string[] | null;
  auto_verify: boolean;
};

type AddonImpact = {
  id: string;
  level: "warn" | "block";
  title: string;
  detail: string;
};

function isSingleInstanceAddon(addon: AddonRow): boolean {
  const haystack = `${addon.name} ${addon.slug} ${addon.type ?? ""}`.toLowerCase();
  return haystack.includes("dominio") || haystack.includes("domain") || haystack.includes("custom_domain") || haystack.includes("custom-domain");
}

async function resolvePaymentMethodsForCountry(country: string | null) {
  const normalizedCountry = normalizeCountryCode(country);
  const { data: methods } = await supabaseAdmin
    .from("plan_payment_methods")
    .select("id,slug,name,countries,auto_verify")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const rows = ((methods ?? []) as MethodSnapshot[]).filter((method) => {
    if (!normalizedCountry) return true;
    if (!Array.isArray(method.countries) || method.countries.length === 0) return true;
    return method.countries.includes(normalizedCountry) || method.countries.includes(country ?? "");
  });

  const rowsWithConfig = await Promise.all(
    rows.map(async (method) => {
      const { data: configRows } = await supabaseAdmin
        .from("plan_payment_method_config")
        .select("key,value")
        .eq("method_id", method.id);

      const config: Record<string, string> = {};
      for (const row of configRows ?? []) {
        if (row.key) config[row.key] = row.value ?? "";
      }

      return { ...method, config };
    })
  );

  return rowsWithConfig;
}

async function buildAddonPreview(params: {
  companyId: string;
  addonId: string;
  quantity: number;
  months: number;
}) {
  const [{ data: company }, { data: addon }, { data: existingAddonRows }] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id,name,country,plan_id,subscription_ends_at")
      .eq("id", params.companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("addons")
      .select("id,slug,name,type,description,price_one_time,price_monthly,is_active")
      .eq("id", params.addonId)
      .maybeSingle(),
    supabaseAdmin
      .from("company_addons")
      .select("id,status,addon_id")
      .eq("company_id", params.companyId)
      .eq("addon_id", params.addonId),
  ]);

  const companyRow = company as CompanyRow | null;
  const addonRow = addon as AddonRow | null;
  if (!companyRow?.id) return { error: "Empresa no encontrada" as const };
  if (!addonRow?.id || addonRow.is_active === false) return { error: "Extra no disponible" as const };

  const { data: currentPlan } = companyRow.plan_id
    ? await supabaseAdmin
        .from("plans")
        .select("id,name,max_branches,max_users,features,marketing_lines")
        .eq("id", companyRow.plan_id)
        .maybeSingle()
    : { data: null };

  const currentPlanRow = (currentPlan as PlanRow | null) ?? null;

  const existingActive = ((existingAddonRows ?? []) as Array<{ id: string; status: string | null }>).some(
    (row) => String(row.status ?? "").toLowerCase() === "active"
  );

  const impacts: AddonImpact[] = [];
  const planOffer = resolveAddonOfferForPlan(
    currentPlanRow,
    {
      id: addonRow.id,
      slug: addonRow.slug,
      name: addonRow.name,
      type: addonRow.type,
      description: addonRow.description,
    }
  );

  if (planOffer.status === "included") {
    impacts.push({
      id: "addon-included-in-plan",
      level: "block",
      title: "Este extra ya viene incluido en tu plan",
      detail: `${planOffer.reason} No corresponde generar un cobro adicional.`,
    });
  }

  if (planOffer.status === "blocked") {
    impacts.push({
      id: "addon-blocked-by-plan",
      level: "block",
      title: "Este extra no esta habilitado para tu plan",
      detail: `${planOffer.reason} Si deseas contratarlo, primero debes cambiar de plan.`,
    });
  }

  const singleInstance = isSingleInstanceAddon(addonRow);
  const safeQuantity = singleInstance ? 1 : params.quantity;
  const safeMonths = Math.max(1, params.months);

  if (singleInstance && existingActive) {
    impacts.push({
      id: "single-instance-owned",
      level: "block",
      title: "Este extra ya esta activo",
      detail: "Este servicio es de instancia unica y no se puede comprar nuevamente.",
    });
  }

  if (singleInstance && params.quantity > 1) {
    impacts.push({
      id: "single-instance-qty",
      level: "warn",
      title: "Cantidad ajustada",
      detail: "Este extra es de instancia unica. La cantidad se ajustara a 1.",
    });
  }

  const isMonthly = Number(addonRow.price_monthly ?? 0) > 0;
  const unitPrice = isMonthly ? Number(addonRow.price_monthly ?? 0) : Number(addonRow.price_one_time ?? 0);
  const amountDue = isMonthly ? Number((unitPrice * safeQuantity * safeMonths).toFixed(2)) : Number((unitPrice * safeQuantity).toFixed(2));

  if (isMonthly) {
    impacts.push({
      id: "monthly-addon-renewal",
      level: "warn",
      title: "Cargo recurrente",
      detail: "Este extra tiene costo mensual y se renovara junto a tu suscripcion cuando corresponda.",
    });
  }

  if (!isMonthly && safeQuantity > 1) {
    impacts.push({
      id: "multiple-provisioning-review",
      level: "warn",
      title: "Provision multiple sujeta a revision",
      detail: "La activacion base se realiza automaticamente; cantidades multiples pueden requerir ajuste por soporte.",
    });
  }

  const paymentMethods = await resolvePaymentMethodsForCountry(companyRow.country);

  return {
    company: companyRow,
    addon: addonRow,
    existingActive,
    planOffer,
    singleInstance,
    pricing: {
      isMonthly,
      unitPrice,
      quantity: safeQuantity,
      months: safeMonths,
      amountDue,
      requiresPayment: amountDue > 0,
    },
    impacts,
    paymentMethods,
  };
}

export async function GET(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const addonId = String(req.nextUrl.searchParams.get("addonId") ?? "").trim();
  const quantity = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get("quantity") ?? 1) || 1));
  const months = Math.max(1, Math.min(24, Number(req.nextUrl.searchParams.get("months") ?? 1) || 1));

  if (!addonId) return NextResponse.json({ error: "Falta addonId" }, { status: 400 });

  const preview = await buildAddonPreview({
    companyId: ctx.companyId,
    addonId,
    quantity,
    months,
  });

  if ("error" in preview) {
    return NextResponse.json({ error: preview.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, preview });
}

export async function POST(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    addonId?: string;
    quantity?: number;
    months?: number;
    methodSlug?: string;
    notes?: string;
    acceptedImpactIds?: string[];
  };

  const addonId = String(body.addonId ?? "").trim();
  const quantity = Math.max(1, Math.min(50, Number(body.quantity ?? 1) || 1));
  const months = Math.max(1, Math.min(24, Number(body.months ?? 1) || 1));
  const methodSlug = String(body.methodSlug ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const acceptedImpactIds = Array.isArray(body.acceptedImpactIds)
    ? body.acceptedImpactIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (!addonId) return NextResponse.json({ error: "Falta addonId" }, { status: 400 });

  const preview = await buildAddonPreview({
    companyId: ctx.companyId,
    addonId,
    quantity,
    months,
  });

  if ("error" in preview) {
    return NextResponse.json({ error: preview.error }, { status: 400 });
  }

  const blockingImpacts = preview.impacts.filter((impact) => impact.level === "block");
  if (blockingImpacts.length > 0) {
    return NextResponse.json({ error: "No puedes comprar este extra en este momento.", impacts: preview.impacts }, { status: 400 });
  }

  const warningIds = preview.impacts.filter((impact) => impact.level === "warn").map((impact) => impact.id);
  const allWarningsAccepted = warningIds.every((id) => acceptedImpactIds.includes(id));
  if (!allWarningsAccepted) {
    return NextResponse.json({ error: "Debes confirmar los avisos antes de continuar.", impacts: preview.impacts }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  if (!preview.pricing.requiresPayment) {
    await supabaseAdmin.from("company_addons").upsert(
      {
        company_id: ctx.companyId,
        addon_id: preview.addon.id,
        status: "active",
        price_paid: 0,
        expires_at: preview.pricing.isMonthly ? preview.company.subscription_ends_at : null,
        updated_at: nowIso,
      },
      { onConflict: "company_id,addon_id" }
    );

    return NextResponse.json({ ok: true, appliedNow: true, preview, message: "Extra activado correctamente." });
  }

  if (!methodSlug) {
    return NextResponse.json({ error: "Selecciona un metodo de pago" }, { status: 400 });
  }

  const selectedMethod = preview.paymentMethods.find((method) => method.slug === methodSlug);
  if (!selectedMethod) {
    return NextResponse.json({ error: "Metodo de pago no disponible" }, { status: 400 });
  }

  const paymentReference = `ADDON-${preview.addon.id}-M${preview.pricing.months}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments_history")
    .insert({
      company_id: ctx.companyId,
      plan_id: preview.company.plan_id,
      amount_paid: preview.pricing.amountDue,
      months_paid: preview.pricing.months,
      payment_method: selectedMethod.name,
      payment_method_slug: selectedMethod.slug,
      payment_reference: paymentReference,
      status: selectedMethod.auto_verify ? "paid" : "pending_validation",
      payment_date: selectedMethod.auto_verify ? nowIso : null,
    })
    .select("id,amount_paid,months_paid,payment_reference,status,payment_method,payment_method_slug,payment_date,reference_file_url")
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message ?? "No se pudo crear el pago" }, { status: 500 });
  }

  if (selectedMethod.auto_verify) {
    await supabaseAdmin.from("company_addons").upsert(
      {
        company_id: ctx.companyId,
        addon_id: preview.addon.id,
        status: "active",
        price_paid: preview.pricing.amountDue,
        expires_at: preview.pricing.isMonthly ? preview.company.subscription_ends_at : null,
        updated_at: nowIso,
      },
      { onConflict: "company_id,addon_id" }
    );
  }

  await supabaseAdmin.from("saas_tickets").insert({
    company_id: ctx.companyId,
    created_by_email: ctx.email,
    source: "tenant",
    subject: `Compra de extra ${selectedMethod.auto_verify ? "aplicada" : "pendiente"} · ${paymentReference}`,
    description: [
      `Extra: ${preview.addon.name}`,
      `Cantidad: ${preview.pricing.quantity}`,
      `Meses: ${preview.pricing.months}`,
      `Monto: ${preview.pricing.amountDue} USD`,
      `Metodo: ${selectedMethod.name}`,
      `Referencia: ${paymentReference}`,
      notes ? `Notas: ${notes}` : null,
      selectedMethod.auto_verify ? "Resultado: activado automaticamente." : "Resultado: pendiente de validacion manual.",
    ]
      .filter(Boolean)
      .join("\n"),
    category: "billing",
    priority: "high",
    status: selectedMethod.auto_verify ? "resolved" : "open",
    last_message_at: nowIso,
    resolved_at: selectedMethod.auto_verify ? nowIso : null,
  });

  return NextResponse.json({
    ok: true,
    appliedNow: selectedMethod.auto_verify,
    payment,
    preview,
    message: selectedMethod.auto_verify
      ? "Pago procesado y extra activado."
      : "Pago creado. El extra se activara al validar el pago.",
  });
}
