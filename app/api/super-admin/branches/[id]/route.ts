import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { mergeDeliverySettingsJson } from "@/lib/delivery/delivery-settings";
import { isExchangeRateSource } from "@/lib/exchange-rates/sources";
import { mergePaymentJsonField } from "@/lib/payments/merge-payment-json-field";
import {
  BRANCH_PAYMENT_PUBLIC_FIELDS,
  mergePublicPaymentConfig,
  sanitizeBranchPaymentMethods,
  validatePublicPaymentConfig,
} from "@/lib/payments/branch-payment-config";
import { selectWithOptionalColumns, updateWithOptionalColumns } from "@/lib/infra/db-compat";
import { logger } from "@/lib/infra/logger";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
  PENDING_BRANCH_COLUMNS,
  pendingBranchMigrationMessage,
  unsavedBranchChanges,
} from "@/lib/tenant/branch-pending-columns";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** @service-role super-admin */

const PAYMENT_JSON_FIELDS = [
  "pago_movil",
  "zelle",
  "binance_pay",
  "transferencia_bancaria",
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

  // Datos de cobro con formato fijo (hoy el Pay ID de Binance): el cliente los copia tal cual.
  for (const field of PAYMENT_JSON_FIELDS) {
    const invalid = Object.prototype.hasOwnProperty.call(body, field) ? validatePublicPaymentConfig(field, body[field]) : null;
    if (invalid) return NextResponse.json({ error: invalid.message, field: invalid.field }, { status: 400 });
  }

  // Fuente de la tasa de cambio (Venezuela): una del BCV o `null` para quitarla.
  const hasExchangeRateSource = Object.prototype.hasOwnProperty.call(body, "exchange_rate_source");
  const nextExchangeRateSource = hasExchangeRateSource ? body.exchange_rate_source : undefined;
  if (hasExchangeRateSource && nextExchangeRateSource !== null && !isExchangeRateSource(nextExchangeRateSource)) {
    return NextResponse.json({ error: "La tasa de cambio elegida no existe.", field: "exchange_rate_source" }, { status: 400 });
  }

  // `binance_pay` y `exchange_rate_source` llegan con migraciones que el dueño corre a mano: sin
  // ellas el select se repite sin esas columnas (llegan en `null`) y el update no las manda.
  const { data: existing, error: existingError, missingColumns } = await selectWithOptionalColumns(
    "id,company_id,name,delivery_settings,payment_methods,pago_movil,zelle,binance_pay,transferencia_bancaria,stripe,mercadopago,paypal,efectivo,tarjeta,exchange_rate_source",
    PENDING_BRANCH_COLUMNS,
    (columns) => supabaseAdmin.from("branches").select(columns).eq("id", branchId).maybeSingle(),
  );

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
    update.payment_methods = sanitizeBranchPaymentMethods(body.payment_methods) ?? [];
  }

  for (const field of PAYMENT_JSON_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      // Los métodos con datos para el cliente solo guardan campos públicos (el menú los
      // lee con la clave anónima); efectivo/tarjeta conservan su configuración interna.
      update[field] =
        field in BRANCH_PAYMENT_PUBLIC_FIELDS
          ? mergePublicPaymentConfig(field, body[field], existing[field as PaymentJsonField])
          : mergePaymentJsonField(body[field], existing[field as PaymentJsonField]);
    }
  }
  // Stripe ya no es método de sucursal: cualquier guardado limpia lo que quedara.
  update.stripe = null;

  const previousExchangeRateSource: string | null = (existing.exchange_rate_source as string | null) ?? null;
  const exchangeRateSourceChanged =
    hasExchangeRateSource && (nextExchangeRateSource ?? null) !== previousExchangeRateSource;
  if (exchangeRateSourceChanged) update.exchange_rate_source = nextExchangeRateSource ?? null;

  if (Object.prototype.hasOwnProperty.call(body, "delivery_settings_patch")) {
    update.delivery_settings = mergeDeliverySettingsJson(
      existing.delivery_settings,
      (body.delivery_settings_patch ?? {}) as Partial<Record<string, unknown>>,
    );
  } else if (Object.prototype.hasOwnProperty.call(body, "delivery_settings")) {
    update.delivery_settings = mergeDeliverySettingsJson(
      existing.delivery_settings,
      (body.delivery_settings ?? {}) as Partial<Record<string, unknown>>,
    );
  }

  // Sin las migraciones de Binance Pay o de tasas, el resto del cambio se guarda igual.
  const { error: updateError, droppedColumns } = await updateWithOptionalColumns(
    update,
    PENDING_BRANCH_COLUMNS,
    (patch) => supabaseAdmin.from("branches").update(patch).eq("id", branchId),
    missingColumns,
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (droppedColumns.length > 0) {
    logger.warn("branch_pending_migration_columns", {
      branchId,
      columns: droppedColumns,
      detail: "Falta aplicar su migración (migrations/20261009_binance_pay.sql, migrations/20261007_exchange_rates.sql): esas columnas no se guardaron.",
    });
  }
  // Sin la columna tampoco existe la tabla del historial (misma migración): no se intenta.
  const exchangeRateSourceSaved = exchangeRateSourceChanged && !droppedColumns.includes("exchange_rate_source");

  // Mismo registro que deja la RPC `set_branch_exchange_rate_source` (que aquí no sirve:
  // exige `auth.uid()`). Quién lo cambió queda en la auditoría de abajo, por correo.
  if (exchangeRateSourceSaved && typeof nextExchangeRateSource === "string") {
    const { error: changeError } = await supabaseAdmin.from("branch_exchange_rate_source_changes").insert({
      company_id: existing.company_id,
      branch_id: branchId,
      old_source: previousExchangeRateSource,
      new_source: nextExchangeRateSource,
      changed_by: null,
    });
    if (changeError) {
      logger.warn("branch_exchange_rate_source_change_not_logged", { branchId, error: changeError.message });
    }
  }

  revalidateTag(`menu:${existing.company_id}`, "max");

  await logAdminAudit({
    actorEmail: permission.email ?? "",
    actorRole: permission.role,
    action: "branch.update",
    resourceType: "branch",
    resourceId: branchId,
    metadata: {
      company_id: existing.company_id,
      via: "api.super-admin.branches.put",
      ...(exchangeRateSourceSaved
        ? { exchange_rate_source: { from: previousExchangeRateSource, to: nextExchangeRateSource ?? null } }
        : {}),
    },
  });

  // Lo demás ya quedó guardado; si lo que no entró era un cambio de verdad (datos de Binance Pay,
  // otra tasa), se avisa. 503: falta algo en el servidor (la migración), no es culpa de la petición.
  const unsaved = unsavedBranchChanges(update, droppedColumns);
  if (unsaved.length > 0) {
    return NextResponse.json({ error: pendingBranchMigrationMessage(unsaved) }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
