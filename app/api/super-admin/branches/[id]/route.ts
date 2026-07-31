import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { mergeDeliverySettingsJson } from "@/lib/delivery/delivery-settings";
import { mergePaymentJsonField } from "@/lib/payments/merge-payment-json-field";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

const PAYMENT_JSON_FIELDS = [
  "pago_movil",
  "zelle",
  "transferencia_bancaria",
  "stripe",
  "mercadopago",
  "paypal",
  "efectivo",
  "tarjeta",
] as const;

type PaymentJsonField = (typeof PAYMENT_JSON_FIELDS)[number];

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

  const { id: branchId } = await context.params;
  if (!branchId) {
    return NextResponse.json({ error: "Falta branch id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("branches")
    .select(
      "id,company_id,name,delivery_settings,payment_methods,pago_movil,zelle,transferencia_bancaria,stripe,mercadopago,paypal,efectivo,tarjeta",
    )
    .eq("id", branchId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};

  for (const key of [
    "name",
    "slug",
    "address",
    "phone",
    "is_active",
    "country",
    "currency",
    "instagram",
    "schedule",
  ] as const) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      update[key] = body[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "payment_methods")) {
    update.payment_methods = Array.isArray(body.payment_methods) ? body.payment_methods : [];
  }

  for (const field of PAYMENT_JSON_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      update[field] = mergePaymentJsonField(body[field], existing[field as PaymentJsonField]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "delivery_settings_patch")) {
    update.delivery_settings = mergeDeliverySettingsJson(
      existing.delivery_settings,
      body.delivery_settings_patch,
    );
  } else if (Object.prototype.hasOwnProperty.call(body, "delivery_settings")) {
    update.delivery_settings = mergeDeliverySettingsJson(
      existing.delivery_settings,
      body.delivery_settings,
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("branches")
    .update(update)
    .eq("id", branchId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  revalidateTag(`menu:${existing.company_id}`, "max");

  await logAdminAudit({
    actorEmail: permission.email ?? "",
    actorRole: permission.role,
    action: "branch.update",
    resourceType: "branch",
    resourceId: branchId,
    metadata: { company_id: existing.company_id, via: "api.super-admin.branches.put" },
  });

  return NextResponse.json({ ok: true });
}
