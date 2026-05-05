import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { sendOnboardingEmail } from "../../../../lib/onboarding/emails";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { checkRateLimit } from "@/lib/infra/rate-limiter";

type PlanRow = {
  id: string;
  name: string;
  price: number | null;
  max_branches: number | null;
  max_users: number | null;
  is_active: boolean | null;
  features: unknown;
  marketing_lines: unknown;
};

type ActiveAddonSnapshot = {
  status: string | null;
  addon:
    | {
        id: string;
        slug: string | null;
        name: string | null;
        type: string | null;
        description: string | null;
      }
    | Array<{
        id: string;
        slug: string | null;
        name: string | null;
        type: string | null;
        description: string | null;
      }>
    | null;
};

type CompanyRow = {
  id: string;
  name: string;
  country: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
};

type MethodSnapshot = {
  id: string;
  slug: string;
  name: string;
  countries: string[] | null;
  auto_verify: boolean;
};

type PlanImpact = {
  id: string;
  level: "warn" | "block";
  title: string;
  detail: string;
};

type ScheduledPlanChangeRow = {
  id: string;
  target_plan_id: string;
  effective_at: string;
  status: string;
};

const COUNTRY_NORMALIZE: Record<string, string> = {
  Chile: "CL",
  Venezuela: "VE",
  CL: "CL",
  VE: "VE",
};

function normalizeCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const c = country.trim();
  return COUNTRY_NORMALIZE[c] ?? c;
}

async function resolvePaymentMethodsForCountry(country: string | null) {
  const normalizedCountry = normalizeCountry(country);
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

      return {
        ...method,
        config,
      };
    })
  );

  return rowsWithConfig;
}

async function buildPlanChangePreview(params: {
  companyId: string;
  targetPlanId: string;
  months: number;
}) {
  const [{ data: company }, { data: plans }, { count: activeBranches }, { count: activeUsers }, { data: entitlements }, { data: scheduledChange }, { data: activeCompanyAddons }] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("id,name,country,plan_id,subscription_status,subscription_ends_at")
      .eq("id", params.companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("plans")
      .select("id,name,price,max_branches,max_users,is_active,features,marketing_lines")
      .eq("is_active", true),
    supabaseAdmin
      .from("branches")
      .select("id", { count: "exact", head: true })
      .eq("company_id", params.companyId)
      .eq("is_active", true),
    supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("company_id", params.companyId)
      .eq("is_active", true),
    supabaseAdmin
      .from("company_branch_extra_entitlements")
      .select("quantity,status,expires_at")
      .eq("company_id", params.companyId),
    supabaseAdmin
      .from("company_plan_change_schedules")
      .select("id,target_plan_id,effective_at,status")
      .eq("company_id", params.companyId)
      .eq("status", "scheduled")
      .maybeSingle(),
    supabaseAdmin
      .from("company_addons")
      .select("status,addon:addons(id,slug,name,type,description)")
      .eq("company_id", params.companyId),
  ]);

  const companyRow = company as CompanyRow | null;
  if (!companyRow?.id) return { error: "Empresa no encontrada" as const };

  const plansRows = (plans ?? []) as PlanRow[];
  const currentPlan = plansRows.find((row) => row.id === companyRow.plan_id) ?? null;
  const targetPlan = plansRows.find((row) => row.id === params.targetPlanId) ?? null;

  if (!targetPlan) return { error: "Plan no disponible" as const };
  if (currentPlan?.id === targetPlan.id) {
    return { error: "Ya estas en ese plan" as const };
  }

  const nowIso = new Date().toISOString();
  const activeEntitlements = ((entitlements ?? []) as Array<{ quantity: number | null; status: string | null; expires_at: string | null }>)
    .filter((row) => row.status === "active")
    .filter((row) => !row.expires_at || row.expires_at > nowIso)
    .reduce((acc, row) => acc + Math.max(0, Number(row.quantity ?? 0) || 0), 0);

  const branchesCount = Number(activeBranches ?? 0);
  const usersCount = Number(activeUsers ?? 0);

  const targetBaseBranches = targetPlan.max_branches;
  const targetEffectiveBranches = targetBaseBranches == null ? null : targetBaseBranches + activeEntitlements;

  const impacts: PlanImpact[] = [];

  if (targetEffectiveBranches != null && branchesCount > targetEffectiveBranches) {
    impacts.push({
      id: "branches-over-limit",
      level: "block",
      title: "Exceso de sucursales para el nuevo plan",
      detail: `Tienes ${branchesCount} sucursales activas y el nuevo limite efectivo seria ${targetEffectiveBranches}. Debes reducir ${branchesCount - targetEffectiveBranches} sucursal(es) antes de cambiar.`,
    });
  }

  if (targetPlan.max_users != null && usersCount > targetPlan.max_users) {
    impacts.push({
      id: "users-over-limit",
      level: "block",
      title: "Exceso de usuarios para el nuevo plan",
      detail: `Tienes ${usersCount} usuario(s) activo(s) y el nuevo plan permite ${targetPlan.max_users}. Debes ajustar usuarios antes de cambiar.`,
    });
  }

  const currentPrice = Number(currentPlan?.price ?? 0) || 0;
  const targetPrice = Number(targetPlan.price ?? 0) || 0;
  const monthlyDiff = Number((targetPrice - currentPrice).toFixed(2));
  const amountDue = monthlyDiff > 0 ? Number((monthlyDiff * Math.max(1, params.months)).toFixed(2)) : 0;

  if (monthlyDiff < 0) {
    impacts.push({
      id: "downgrade-no-refund",
      level: "warn",
      title: "Cambio a plan menor",
      detail: "El cambio se aplica sin reembolso del periodo ya pagado. Se reflejara en tu siguiente ciclo.",
    });

    if (!companyRow.subscription_ends_at) {
      impacts.push({
        id: "downgrade-no-cycle-end",
        level: "block",
        title: "No hay vencimiento configurado",
        detail: "No encontramos fecha de vencimiento para programar el downgrade. Contacta a soporte para regularizar el ciclo.",
      });
    }
  }

  if (monthlyDiff > 0) {
    impacts.push({
      id: "upgrade-payment-required",
      level: "warn",
      title: "Requiere pago para aplicar ahora",
      detail: `Debes pagar ${amountDue} USD para aplicar el nuevo plan de inmediato.`,
    });
  }

  impacts.push({
    id: "feature-difference-check",
    level: "warn",
    title: "Revisa funciones incluidas",
    detail: "Al cambiar de plan, algunas capacidades pueden variar segun los limites del nuevo plan.",
  });

  const activeAddonRows = ((activeCompanyAddons ?? []) as ActiveAddonSnapshot[]).filter(
    (row) => String(row.status ?? "").toLowerCase() === "active"
  );
  for (const row of activeAddonRows) {
    const addonRaw = Array.isArray(row.addon) ? row.addon[0] : row.addon;
    if (!addonRaw?.id || !addonRaw.name) continue;

    const currentOffer = resolveAddonOfferForPlan(currentPlan, {
      id: addonRaw.id,
      slug: addonRaw.slug,
      name: addonRaw.name,
      type: addonRaw.type,
      description: addonRaw.description,
    });
    const targetOffer = resolveAddonOfferForPlan(targetPlan, {
      id: addonRaw.id,
      slug: addonRaw.slug,
      name: addonRaw.name,
      type: addonRaw.type,
      description: addonRaw.description,
    });

    if (targetOffer.status === "included" && currentOffer.status !== "included") {
      impacts.push({
        id: `addon-included-after-change-${addonRaw.id}`,
        level: "warn",
        title: `${addonRaw.name} quedara incluido en el plan objetivo`,
        detail: `Actualmente lo tienes como extra activo. ${targetOffer.reason} Revisa con soporte si deseas ajustar el cobro de este extra.`,
      });
    }

    if (targetOffer.status === "blocked") {
      impacts.push({
        id: `addon-policy-change-${addonRaw.id}`,
        level: "warn",
        title: `${addonRaw.name} cambia de politica en el plan objetivo`,
        detail: `${targetOffer.reason} Tu extra activo no se elimina automaticamente, pero puede requerir regularizacion operativa.`,
      });
    }
  }

  const paymentMethods = await resolvePaymentMethodsForCountry(companyRow.country);

  return {
    company: companyRow,
    currentPlan,
    targetPlan,
    counts: {
      activeBranches: branchesCount,
      activeUsers: usersCount,
      activeExtraBranchEntitlements: activeEntitlements,
      targetEffectiveBranches,
    },
    pricing: {
      currentPrice,
      targetPrice,
      monthlyDiff,
      months: Math.max(1, params.months),
      amountDue,
      requiresPayment: amountDue > 0,
    },
    execution: {
      mode: monthlyDiff < 0 ? "scheduled_cycle_end" : "immediate",
      effectiveAt: monthlyDiff < 0 ? (companyRow.subscription_ends_at ?? null) : new Date().toISOString(),
      existingSchedule:
        (scheduledChange as ScheduledPlanChangeRow | null)?.status === "scheduled"
          ? {
              id: (scheduledChange as ScheduledPlanChangeRow).id,
              targetPlanId: (scheduledChange as ScheduledPlanChangeRow).target_plan_id,
              effectiveAt: (scheduledChange as ScheduledPlanChangeRow).effective_at,
            }
          : null,
    },
    impacts,
    paymentMethods,
  };
}

async function resolveCompanyPrimaryContact(companyId: string) {
  const [{ data: app }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from("onboarding_applications")
      .select("email,responsible_name,business_name")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("companies")
      .select("name,email")
      .eq("id", companyId)
      .maybeSingle(),
  ]);

  return {
    email: String(app?.email ?? company?.email ?? "").trim(),
    responsibleName: String(app?.responsible_name ?? "Cliente"),
    businessName: String(app?.business_name ?? company?.name ?? "Tu negocio"),
  };
}

export async function GET(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!checkRateLimit(`plan_change_get:${ctx.companyId}`, 30, 60000)) {
    return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
  }

  const targetPlanId = String(req.nextUrl.searchParams.get("targetPlanId") ?? "").trim();
  const months = Math.max(1, Math.min(24, Number(req.nextUrl.searchParams.get("months") ?? 1) || 1));
  if (!targetPlanId) return NextResponse.json({ error: "Falta targetPlanId" }, { status: 400 });

  const preview = await buildPlanChangePreview({
    companyId: ctx.companyId,
    targetPlanId,
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

  if (!checkRateLimit(`plan_change_post:${ctx.companyId}`, 10, 60000)) {
    return NextResponse.json({ error: "Demasiadas peticiones. Intenta en un minuto." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    targetPlanId?: string;
    months?: number;
    methodSlug?: string;
    acceptedImpactIds?: string[];
  };

  const targetPlanId = String(body.targetPlanId ?? "").trim();
  const months = Math.max(1, Math.min(24, Number(body.months ?? 1) || 1));
  const methodSlug = String(body.methodSlug ?? "").trim();
  const acceptedImpactIds = Array.isArray(body.acceptedImpactIds)
    ? body.acceptedImpactIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (!targetPlanId) {
    return NextResponse.json({ error: "Falta targetPlanId" }, { status: 400 });
  }

  const preview = await buildPlanChangePreview({
    companyId: ctx.companyId,
    targetPlanId,
    months,
  });

  if ("error" in preview) {
    return NextResponse.json({ error: preview.error }, { status: 400 });
  }

  const blockingImpacts = preview.impacts.filter((impact) => impact.level === "block");
  if (blockingImpacts.length > 0) {
    return NextResponse.json(
      {
        error: "No puedes aplicar este cambio todavia.",
        impacts: preview.impacts,
      },
      { status: 400 }
    );
  }

  const warningIds = preview.impacts.filter((impact) => impact.level === "warn").map((impact) => impact.id);
  const allWarningsAccepted = warningIds.every((id) => acceptedImpactIds.includes(id));
  if (!allWarningsAccepted) {
    return NextResponse.json(
      {
        error: "Debes confirmar los avisos antes de continuar.",
        impacts: preview.impacts,
      },
      { status: 400 }
    );
  }

  if (preview.pricing.monthlyDiff < 0) {
    const effectiveAt = preview.execution?.effectiveAt;
    if (!effectiveAt) {
      return NextResponse.json({ error: "No se pudo programar el downgrade por falta de vencimiento." }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("company_plan_change_schedules")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("status", "scheduled")
      .maybeSingle();

    const nowIso = new Date().toISOString();
    if (existing?.id) {
      await supabaseAdmin
        .from("company_plan_change_schedules")
        .update({
          target_plan_id: preview.targetPlan.id,
          current_plan_id: preview.currentPlan?.id ?? null,
          requested_by_email: ctx.email,
          effective_at: effectiveAt,
          reason: "Downgrade programado desde portal del cliente",
          metadata: {
            monthlyDiff: preview.pricing.monthlyDiff,
            amountDue: preview.pricing.amountDue,
          },
          updated_at: nowIso,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("company_plan_change_schedules").insert({
        company_id: ctx.companyId,
        current_plan_id: preview.currentPlan?.id ?? null,
        target_plan_id: preview.targetPlan.id,
        requested_by_email: ctx.email,
        status: "scheduled",
        effective_at: effectiveAt,
        reason: "Downgrade programado desde portal del cliente",
        metadata: {
          monthlyDiff: preview.pricing.monthlyDiff,
          amountDue: preview.pricing.amountDue,
        },
        updated_at: nowIso,
      });
    }

    await supabaseAdmin.from("saas_tickets").insert({
      company_id: ctx.companyId,
      created_by_email: ctx.email,
      source: "tenant",
      subject: `Downgrade programado · ${preview.currentPlan?.name ?? "Plan actual"} -> ${preview.targetPlan.name}`,
      description: [
        `Plan actual: ${preview.currentPlan?.name ?? "Sin plan"}`,
        `Nuevo plan: ${preview.targetPlan.name}`,
        `Aplicacion programada para: ${effectiveAt}`,
        "No se aplica de inmediato; se ejecuta al cierre del ciclo vigente.",
      ].join("\n"),
      category: "billing",
      priority: "medium",
      status: "resolved",
      last_message_at: nowIso,
      resolved_at: nowIso,
    });

    const contact = await resolveCompanyPrimaryContact(ctx.companyId);
    if (contact.email) {
      await sendOnboardingEmail({
        type: "plan_downgrade_scheduled",
        to: contact.email,
        from: process.env.RESEND_FROM ?? "noreply@example.com",
        apiKey: process.env.RESEND_API_KEY ?? "",
        responsibleName: contact.responsibleName,
        businessName: contact.businessName,
        currentPlanName: preview.currentPlan?.name ?? "Plan actual",
        targetPlanName: preview.targetPlan.name,
        effectiveAt,
        panelUrl: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      appliedNow: false,
      scheduled: true,
      preview,
      message: "Downgrade programado. Se aplicara automaticamente al cierre de tu ciclo actual.",
    });
  }

  if (!preview.pricing.requiresPayment) {
    await supabaseAdmin
      .from("companies")
      .update({
        plan_id: preview.targetPlan.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.companyId);

    await supabaseAdmin.from("saas_tickets").insert({
      company_id: ctx.companyId,
      created_by_email: ctx.email,
      source: "tenant",
      subject: `Cambio de plan aplicado · ${preview.currentPlan?.name ?? "Actual"} -> ${preview.targetPlan.name}`,
      description: [
        `Plan anterior: ${preview.currentPlan?.name ?? "Sin plan"}`,
        `Plan nuevo: ${preview.targetPlan.name}`,
        "Aplicacion inmediata sin cobro adicional.",
      ].join("\n"),
      category: "billing",
      priority: "medium",
      status: "resolved",
      last_message_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      appliedNow: true,
      message: "Plan actualizado correctamente.",
      preview,
    });
  }

  if (!methodSlug) {
    return NextResponse.json({ error: "Selecciona un metodo de pago" }, { status: 400 });
  }

  const selectedMethod = preview.paymentMethods.find((method) => method.slug === methodSlug);
  if (!selectedMethod) {
    return NextResponse.json({ error: "Metodo de pago no disponible" }, { status: 400 });
  }

  const paymentReference = `PLANCHG-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments_history")
    .insert({
      company_id: ctx.companyId,
      plan_id: preview.targetPlan.id,
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
    await supabaseAdmin
      .from("companies")
      .update({
        plan_id: preview.targetPlan.id,
        subscription_status: "active",
        updated_at: nowIso,
      })
      .eq("id", ctx.companyId);
  }

  await supabaseAdmin.from("saas_tickets").insert({
    company_id: ctx.companyId,
    created_by_email: ctx.email,
    source: "tenant",
    subject: `Cambio de plan ${selectedMethod.auto_verify ? "aplicado" : "pendiente"} · ${paymentReference}`,
    description: [
      `Plan anterior: ${preview.currentPlan?.name ?? "Sin plan"}`,
      `Plan nuevo: ${preview.targetPlan.name}`,
      `Monto: ${preview.pricing.amountDue} USD`,
      `Metodo: ${selectedMethod.name}`,
      `Referencia: ${paymentReference}`,
      selectedMethod.auto_verify ? "Resultado: cambio aplicado automaticamente." : "Resultado: pendiente de validacion manual.",
    ].join("\n"),
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
      ? "Pago procesado y plan actualizado."
      : "Pago creado. El cambio de plan se aplicara cuando validemos tu pago.",
  });
}
