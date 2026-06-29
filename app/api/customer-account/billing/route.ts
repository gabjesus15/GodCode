import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import {
	buildBillingOptionsResponse,
	computeExpansionAmount,
	getCustomerAccountBillingContext,
} from "@/lib/tenant/customer-account-billing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { checkRateLimit } from "@/lib/infra/rate-limiter";
import { logger } from "@/lib/infra/logger";

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

  const billingCtx = await getCustomerAccountBillingContext(ctx.companyId);
  if (!billingCtx) {
    return NextResponse.json({ error: "No se pudo cargar el contexto de facturacion" }, { status: 404 });
  }

  return NextResponse.json(buildBillingOptionsResponse(ctx.companyId, billingCtx));
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

  const billingCtx = await getCustomerAccountBillingContext(ctx.companyId);
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
  const expansionPricing = computeExpansionAmount({
    unitPrice,
    quantity,
    months,
    subscriptionEndsAt: billingCtx.company.subscription_ends_at,
    now,
  });
  const { firstCycleFactor, effectiveMonths, amount, daysUntilPlanEnd } = expansionPricing;
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
