import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { checkRateLimit } from "@/lib/infra/rate-limiter";
import { normalizeCountryCode } from "@/lib/geo/country-registry";
import { resolveContinentFromCountryInput } from "@/lib/plans/plan-regional-pricing";
import { logger } from "@/lib/infra/logger";

type CompanySnapshot = {
  id: string;
  name: string;
  country: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  plan: {
    id: string;
    name: string;
    max_branches: number | null;
  } | null;
};

type AddonSnapshot = {
  id: string;
  slug: string;
  name: string;
  type: string;
  price_monthly: number | null;
  price_one_time: number | null;
};

type MethodSnapshot = {
  id: string;
  slug: string;
  name: string;
  countries: string[] | null;
  auto_verify: boolean;
};

type BranchEntitlementSnapshot = {
  quantity: number | null;
  status: string | null;
  expires_at: string | null;
};

const DEFAULT_BRANCH_EXPANSION_MONTHLY_USD = 20;

function isBranchExpansionAddon(addon: AddonSnapshot): boolean {
  const haystack = `${addon.slug} ${addon.name} ${addon.type}`.toLowerCase();
  return haystack.includes("branch") || haystack.includes("sucursal");
}

function resolveBranchAddonPrice(addon: AddonSnapshot | null, country: string | null | undefined): number {
  if (addon?.price_monthly && addon.price_monthly > 0) {
    return addon.price_monthly;
  }
  const continent = resolveContinentFromCountryInput(country);
  if (continent === "USA/Canada" || continent === "Europe") {
    return 30; // 30 USD for first-world
  }
  return DEFAULT_BRANCH_EXPANSION_MONTHLY_USD; // 20 USD for LATAM
}

function getDaysUntil(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const endMs = new Date(iso).getTime();
  if (Number.isNaN(endMs)) return null;
  const diff = endMs - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

async function getBillingContext(companyId: string) {
  const [{ data: company }, { count: branchCount }, { data: addons }, { data: methods }, { data: entitlements }] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id,name,country,plan_id,subscription_status,subscription_ends_at,plan:plans(id,name,max_branches)")
      .eq("id", companyId)
      .maybeSingle(),
    supabaseAdmin.from("branches").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabaseAdmin
      .from("addons")
      .select("id,slug,name,type,price_monthly,price_one_time")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("plan_payment_methods")
      .select("id,slug,name,countries,auto_verify")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("company_branch_extra_entitlements")
      .select("quantity,status,expires_at")
      .eq("company_id", companyId),
  ]);

  const snapshot = company as CompanySnapshot | null;
  if (!snapshot?.id) return null;

  const normalizedCountry = normalizeCountryCode(snapshot.country);
  const methodsRows = ((methods ?? []) as MethodSnapshot[]).filter((method) => {
    if (!normalizedCountry) return true;
    if (!Array.isArray(method.countries) || method.countries.length === 0) return true;
    return method.countries.includes(normalizedCountry) || method.countries.includes(snapshot.country ?? "");
  });

  const methodsWithConfig = await Promise.all(
    methodsRows.map(async (method) => {
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

  const branchAddon = ((addons ?? []) as AddonSnapshot[]).find(isBranchExpansionAddon) ?? null;
  const branchPriceMonthly = resolveBranchAddonPrice(branchAddon, snapshot.country);
  const maxBranches = snapshot.plan?.max_branches ?? null;
  const activeBranchCount = Number(branchCount ?? 0);
  const nowIso = new Date().toISOString();
  const extraBranchEntitlements = ((entitlements ?? []) as BranchEntitlementSnapshot[])
    .filter((row) => row.status === "active")
    .filter((row) => !row.expires_at || row.expires_at > nowIso)
    .reduce((acc, row) => acc + Math.max(0, Number(row.quantity ?? 0) || 0), 0);
  const effectiveMaxBranches = maxBranches == null ? null : maxBranches + extraBranchEntitlements;
  const requiresPaymentForExpansion = effectiveMaxBranches != null && activeBranchCount >= effectiveMaxBranches;

  return {
    company: snapshot,
    activeBranchCount,
    maxBranches,
    extraBranchEntitlements,
    effectiveMaxBranches,
    branchAddon,
    branchPriceMonthly,
    requiresPaymentForExpansion,
    paymentMethods: methodsWithConfig,
  };
}

async function activateBranchExpansionEntitlement(params: {
  companyId: string;
  paymentId: string;
  nowIso: string;
  expiresAt: string | null;
  branchAddonId: string | null;
  amountPaid: number;
}) {
  if (params.branchAddonId) {
    await supabaseAdmin.from("company_addons").upsert(
      {
        company_id: params.companyId,
        addon_id: params.branchAddonId,
        status: "active",
        price_paid: params.amountPaid,
        expires_at: params.expiresAt,
        updated_at: params.nowIso,
      },
      { onConflict: "company_id,addon_id" }
    );
  }

  await supabaseAdmin
    .from("company_branch_extra_entitlements")
    .update({
      status: "active",
      starts_at: params.nowIso,
      expires_at: params.expiresAt,
      updated_at: params.nowIso,
    })
    .eq("payment_id", params.paymentId);
}

export async function GET() {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!(await checkRateLimit(`billing_get:${ctx.companyId}`, 30, 60000))) {
    logger.warn("Rate limit hit in billing GET", { companyId: ctx.companyId });
    return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
  }

  logger.info("Fetching billing context", { companyId: ctx.companyId });

  const billingCtx = await getBillingContext(ctx.companyId);
  if (!billingCtx) {
    return NextResponse.json({ error: "No se pudo cargar el contexto de facturacion" }, { status: 404 });
  }

  const now = new Date();
  const daysUntilPlanEnd = getDaysUntil(billingCtx.company.subscription_ends_at, now);

  return NextResponse.json({
    companyId: ctx.companyId,
    activeBranchCount: billingCtx.activeBranchCount,
    maxBranches: billingCtx.maxBranches,
    extraBranchEntitlements: billingCtx.extraBranchEntitlements,
    effectiveMaxBranches: billingCtx.effectiveMaxBranches,
    requiresPaymentForExpansion: billingCtx.requiresPaymentForExpansion,
    branchExpansionPriceMonthly: billingCtx.branchPriceMonthly,
    coTermWithSubscription: true,
    daysUntilPlanEnd,
    branchAddon: billingCtx.branchAddon
      ? {
          id: billingCtx.branchAddon.id,
          slug: billingCtx.branchAddon.slug,
          name: billingCtx.branchAddon.name,
        }
      : null,
    paymentMethods: billingCtx.paymentMethods,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!(await checkRateLimit(`billing_post:${ctx.companyId}`, 10, 60000))) {
    logger.warn("Rate limit hit in billing POST", { companyId: ctx.companyId });
    return NextResponse.json({ error: "Demasiadas peticiones. Intenta en un minuto." }, { status: 429 });
  }

  logger.info("Starting checkout process", { companyId: ctx.companyId });

  const payload = (await req.json().catch(() => ({}))) as {
    quantity?: number;
    months?: number;
    methodSlug?: string;
    notes?: string;
    branchName?: string;
    branchAddress?: string;
  };

  const quantity = Math.max(1, Math.min(20, Number(payload.quantity ?? 1) || 1));
  const months = Math.max(1, Math.min(24, Number(payload.months ?? 1) || 1));
  const methodSlug = String(payload.methodSlug ?? "").trim();
  const notes = String(payload.notes ?? "").trim();
  const branchName = String(payload.branchName ?? "").trim();
  const branchAddress = String(payload.branchAddress ?? "").trim();

  if (!methodSlug) {
    return NextResponse.json({ error: "Selecciona un metodo de pago" }, { status: 400 });
  }

  const billingCtx = await getBillingContext(ctx.companyId);
  if (!billingCtx) {
    return NextResponse.json({ error: "No se pudo cargar el contexto de facturacion" }, { status: 404 });
  }

  if (!billingCtx.requiresPaymentForExpansion) {
    return NextResponse.json(
      {
        error:
          "Tu plan aun permite crear sucursales sin pago adicional. Usa la solicitud directa de sucursal.",
      },
      { status: 400 }
    );
  }

  if (!billingCtx.company.plan_id) {
    return NextResponse.json({ error: "Tu empresa no tiene plan asignado" }, { status: 400 });
  }

  const unitPrice = billingCtx.branchPriceMonthly;
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return NextResponse.json(
      {
        error:
          "No hay precio configurado para expansion de sucursales. Contacta soporte para habilitarlo.",
      },
      { status: 400 }
    );
  }

  const selectedMethod = billingCtx.paymentMethods.find((method) => method.slug === methodSlug);
  if (!selectedMethod) {
    return NextResponse.json({ error: "Metodo de pago no disponible para tu pais" }, { status: 400 });
  }

  const now = new Date();
  const daysUntilPlanEnd = getDaysUntil(billingCtx.company.subscription_ends_at, now);
  const firstCycleFactor =
    daysUntilPlanEnd != null && daysUntilPlanEnd > 0 ? Math.max(1 / 30, Math.min(1, daysUntilPlanEnd / 30)) : 1;
  const effectiveMonths = firstCycleFactor + Math.max(0, months - 1);
  const amount = Number((unitPrice * quantity * effectiveMonths).toFixed(2));
  const paymentReference = `CUST-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments_history")
    .insert({
      company_id: ctx.companyId,
      plan_id: billingCtx.company.plan_id,
      amount_paid: amount,
      months_paid: months,
      payment_method: selectedMethod.name,
      payment_method_slug: selectedMethod.slug,
      payment_reference: paymentReference,
      status: selectedMethod.auto_verify ? "paid" : "pending_validation",
      payment_date: selectedMethod.auto_verify ? new Date().toISOString() : null,
    })
    .select("id,amount_paid,months_paid,payment_reference,status,payment_method,payment_method_slug,payment_date,reference_file_url")
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message ?? "No se pudo crear el pago" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const entitlementStatus = selectedMethod.auto_verify ? "active" : "pending";

  const { error: entitlementError } = await supabaseAdmin
    .from("company_branch_extra_entitlements")
    .insert({
      company_id: ctx.companyId,
      payment_id: payment.id,
      quantity,
      months_purchased: months,
      first_cycle_factor: Number(firstCycleFactor.toFixed(6)),
      effective_months: Number(effectiveMonths.toFixed(6)),
      unit_price: unitPrice,
      amount_paid: amount,
      status: entitlementStatus,
      starts_at: selectedMethod.auto_verify ? nowIso : null,
      expires_at: selectedMethod.auto_verify ? billingCtx.company.subscription_ends_at : null,
      updated_at: nowIso,
    });

  if (entitlementError) {
    return NextResponse.json({ error: entitlementError.message }, { status: 500 });
  }

  if (selectedMethod.auto_verify) {
    await activateBranchExpansionEntitlement({
      companyId: ctx.companyId,
      paymentId: payment.id,
      nowIso,
      expiresAt: billingCtx.company.subscription_ends_at,
      branchAddonId: billingCtx.branchAddon?.id ?? null,
      amountPaid: amount,
    });
  }

  const ticketDescription = [
    `Empresa: ${billingCtx.company.name}`,
    `Solicitud: expansion de sucursales`,
    `Sucursales actuales: ${billingCtx.activeBranchCount}`,
    `Limite base plan: ${billingCtx.maxBranches ?? "sin limite"}`,
    `Sucursales extra vigentes: ${billingCtx.extraBranchEntitlements}`,
    `Capacidad efectiva: ${billingCtx.effectiveMaxBranches ?? "sin limite"}`,
    `Cantidad solicitada: ${quantity}`,
      `Meses solicitados: ${months}`,
      `Factor primer ciclo: ${firstCycleFactor.toFixed(4)}`,
      `Meses efectivos cobrados: ${effectiveMonths.toFixed(4)}`,
    `Metodo: ${selectedMethod.name}`,
    `Monto total: ${amount} USD`,
    `Referencia de pago: ${paymentReference}`,
      daysUntilPlanEnd != null
        ? `Regla de vigencia: extra co-terminado con plan (dias restantes del ciclo actual: ${daysUntilPlanEnd})`
        : "Regla de vigencia: ciclo mensual estandar (sin fecha de vencimiento de plan configurada)",
    branchName ? `Nueva sucursal (nombre): ${branchName}` : null,
    branchAddress ? `Nueva sucursal (direccion): ${branchAddress}` : null,
    notes ? `Notas cliente: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: ticket } = await supabaseAdmin
    .from("saas_tickets")
    .insert({
      company_id: ctx.companyId,
      created_by_email: ctx.email,
      source: "tenant",
      subject: `Pago expansion sucursales · ${paymentReference}`,
      description: ticketDescription,
      category: "billing",
      priority: "high",
      status: "open",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (ticket?.id) {
    await supabaseAdmin.from("saas_ticket_messages").insert({
      ticket_id: ticket.id,
      author_type: "tenant",
      author_email: ctx.email,
      is_internal: false,
      message: ticketDescription,
    });
  }

  return NextResponse.json({
    ok: true,
    payment,
    instructions: {
      method: {
        slug: selectedMethod.slug,
        name: selectedMethod.name,
        config: selectedMethod.config,
      },
      summary: {
        unitPrice,
        quantity,
        months,
        firstCycleFactor,
        effectiveMonths,
        coTermWithSubscription: true,
        daysUntilPlanEnd,
        amount,
        requiresManualProof: !selectedMethod.auto_verify,
      },
    },
  });
}
