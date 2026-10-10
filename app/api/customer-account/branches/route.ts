import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isExchangeRateSource } from "@/lib/exchange-rates/sources";
import { isVenezuelaCountry } from "@/lib/geo/venezuela";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { selectWithOptionalColumns, updateWithOptionalColumns } from "@/lib/infra/db-compat";
import { logger } from "@/lib/infra/logger";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
  mergePublicPaymentConfig,
  sanitizeBranchPaymentMethods,
  validatePublicPaymentConfig,
} from "@/lib/payments/branch-payment-config";
import { branchBusinessHoursUpdate, branchCountryResolver } from "@/lib/tenant/branch-country";
import {
  PENDING_BRANCH_COLUMNS,
  pendingBranchMigrationMessage,
  unsavedBranchChanges,
} from "@/lib/tenant/branch-pending-columns";
import { hasAnyBusinessHours, normalizeBusinessHours } from "@/lib/tenant/business-hours";
import { parseBranchContactUrlInput } from "@/lib/tenant/home-page/home-page-config";

/** @service-role customer-account */

function defaultPaymentPolicy(method: string) {
  const normalized = method.toLowerCase();
  const rail = ["efectivo", "cash", "tienda", "cash_usd", "cash_ves"].includes(normalized)
    ? "cash"
    : ["tarjeta", "card", "stripe", "mercadopago"].includes(normalized)
      ? "card"
      : "online";
  const requiresReceipt = ["pago_movil", "zelle", "binance_pay", "paypal", "transferencia_bancaria"].includes(normalized);
  return {
    method_name: method,
    display_name: method.replaceAll("_", " "),
    is_active: true,
    requires_receipt: requiresReceipt,
    rail,
    settlement_trigger: rail === "cash"
      ? "cash_confirmation"
      : ["tarjeta", "card"].includes(normalized)
        ? "pos_confirmation"
        : ["stripe", "mercadopago"].includes(normalized)
          ? "gateway_webhook"
          : requiresReceipt
            ? "evidence_uploaded"
            : "manual_verification",
    settlement_currency: normalized === "pago_movil"
      ? "VES"
      : normalized === "zelle" || normalized === "binance_pay"
        ? "USD"
        : null,
    allow_mixed_payment: true,
  };
}

export async function PUT(req: NextRequest) {
  const ctx = await getCustomerAccountContext();
  
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limited = await assertCustomerAccountRateLimit(ctx.companyId, "branches_put", 30, 60_000);
  if (limited) return limited;

  // Enforce CEO-only access as confirmed by the user
  if (ctx.role !== "ceo") {
    return NextResponse.json(
      { error: "No autorizado. Solo el CEO puede editar sucursales." },
      { status: 403 }
    );
  }

  const payload = await req.json().catch(() => ({}));
  const {
    id,
    name,
    address,
    phone,
    schedule,
    business_hours,
    instagram_url,
    whatsapp_url,
    map_url,
    origin_lat,
    origin_lng,
    payment_methods,
    pago_movil,
    zelle,
    binance_pay,
    transferencia_bancaria,
    mercadopago,
    paypal,
    order_intake_paused,
    order_intake_pause_message,
    exchange_rate_source,
  } = payload;

  if (!id) {
    return NextResponse.json({ error: "El ID de la sucursal es requerido" }, { status: 400 });
  }

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "El nombre de la sucursal es requerido" }, { status: 400 });
  }

  // Los enlaces acaban en un `href` de la página pública: solo direcciones web válidas.
  const contactUrls: Record<string, string | null> = {};
  for (const [field, label, raw] of [
    ["whatsapp_url", "WhatsApp", whatsapp_url],
    ["instagram_url", "Instagram", instagram_url],
    ["map_url", "Google Maps", map_url],
  ] as const) {
    const parsed = parseBranchContactUrlInput(raw ?? null);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: `El enlace de ${label} no es válido. Pega la dirección completa (https://…).`, field },
        { status: 400 },
      );
    }
    contactUrls[field] = parsed.value ?? null;
  }

  // Datos de cobro con formato fijo (hoy el Pay ID de Binance): el cliente los copia
  // tal cual para pagar, así que un valor inválido no se guarda.
  for (const [column, incoming] of [
    ["binance_pay", binance_pay],
    ["pago_movil", pago_movil],
    ["zelle", zelle],
    ["transferencia_bancaria", transferencia_bancaria],
    ["mercadopago", mercadopago],
    ["paypal", paypal],
  ] as const) {
    const invalid = validatePublicPaymentConfig(column, incoming);
    if (invalid) return NextResponse.json({ error: invalid.message, field: invalid.field }, { status: 400 });
  }

  // Fuente de la tasa de cambio: solo las del BCV. Se aplica más abajo, solo en Venezuela.
  const hasExchangeRateSourceField = Object.prototype.hasOwnProperty.call(payload, "exchange_rate_source");
  if (hasExchangeRateSourceField && !isExchangeRateSource(exchange_rate_source)) {
    return NextResponse.json({ error: "La tasa de cambio elegida no existe.", field: "exchange_rate_source" }, { status: 400 });
  }

  const toCoordinate = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  // Horario: sin días cargados no hay nada que hacer cumplir; activarlo así dejaría la
  // sucursal abierta siempre sin que el dueño lo note.
  const hasBusinessHoursField = Object.prototype.hasOwnProperty.call(payload, "business_hours");
  const businessHours = hasBusinessHoursField ? normalizeBusinessHours(business_hours) : null;
  if (businessHours?.enabled && !hasAnyBusinessHours(businessHours)) {
    return NextResponse.json(
      { error: "Agrega al menos un día con horario o desactiva la pausa automática.", field: "business_hours" },
      { status: 400 },
    );
  }

  // Verify branch ownership and get current pause state + payment configs.
  // `binance_pay` y `exchange_rate_source` llegan con migraciones que el dueño corre a mano: sin
  // ellas el select se repite sin esas columnas (llegan en `null`) y el update no las manda.
  const { data: branch, error: fetchError, missingColumns } = await selectWithOptionalColumns(
    "company_id, country, exchange_rate_source, order_intake_paused, pago_movil, zelle, binance_pay, transferencia_bancaria, mercadopago, paypal",
    PENDING_BRANCH_COLUMNS,
    (columns) => supabaseAdmin.from("branches").select(columns).eq("id", id).maybeSingle(),
  );

  // Un fallo de la base no es «no encontrada»: así se veía el 42703 de las columnas nuevas.
  if (fetchError) {
    logger.error("customer_account_branch_read_failed", { branchId: String(id), code: fetchError.code, error: fetchError.message });
    return NextResponse.json({ error: "No se pudo leer la sucursal. Intenta de nuevo." }, { status: 500 });
  }
  if (!branch) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  if (branch.company_id !== ctx.companyId) {
    return NextResponse.json(
      { error: "No tienes permisos para modificar esta sucursal" },
      { status: 403 }
    );
  }

  // El país de la sucursal (o el del negocio): se consulta una sola vez y solo si hace falta
  // (horario o tasa de cambio). El horario sale con la zona de ese país.
  const resolveBranchCountry = branchCountryResolver(supabaseAdmin, {
    branchCountry: branch.country as string | null,
    companyId: ctx.companyId,
  });
  const businessHoursPatch = hasBusinessHoursField ? await branchBusinessHoursUpdate(businessHours, resolveBranchCountry) : null;

  // Solo una sucursal de Venezuela tiene tasa que elegir; fuera de ahí el campo se ignora
  // (el modal no lo muestra). El cambio queda registrado, como hace la RPC
  // `set_branch_exchange_rate_source`, que aquí no sirve porque exige `auth.uid()`.
  const previousSource: string | null = (branch.exchange_rate_source as string | null) ?? null;
  const nextSource =
    hasExchangeRateSourceField && isExchangeRateSource(exchange_rate_source) && isVenezuelaCountry(await resolveBranchCountry())
      ? exchange_rate_source
      : null;
  const exchangeRateSourceChanged = nextSource != null && nextSource !== previousSource;

  const parsedPaused = !!order_intake_paused;
  const wasPaused = !!branch.order_intake_paused;

  let finalPausedAt = undefined;
  let finalPausedBy = undefined;

  if (parsedPaused !== wasPaused) {
    if (parsedPaused) {
      finalPausedAt = new Date().toISOString();
      finalPausedBy = ctx.userId;
    } else {
      finalPausedAt = null;
      finalPausedBy = null;
    }
  }

  // Perform update
  const patch = {
    name: name.trim(),
    address: typeof address === "string" && address.trim() ? address.trim() : null,
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
    schedule: typeof schedule === "string" && schedule.trim() ? schedule.trim() : null,
    ...(businessHoursPatch ?? {}),
    ...contactUrls,
    origin_lat: toCoordinate(origin_lat),
    origin_lng: toCoordinate(origin_lng),
    payment_methods: sanitizeBranchPaymentMethods(payment_methods) ?? [],
    // Solo datos públicos: el menú los lee con la clave anónima y los enseña al cliente.
    pago_movil: mergePublicPaymentConfig("pago_movil", pago_movil, branch.pago_movil),
    zelle: mergePublicPaymentConfig("zelle", zelle, branch.zelle),
    binance_pay: mergePublicPaymentConfig("binance_pay", binance_pay, branch.binance_pay),
    transferencia_bancaria: mergePublicPaymentConfig(
      "transferencia_bancaria",
      transferencia_bancaria,
      branch.transferencia_bancaria,
    ),
    stripe: null,
    mercadopago: mergePublicPaymentConfig("mercadopago", mercadopago, branch.mercadopago),
    paypal: mergePublicPaymentConfig("paypal", paypal, branch.paypal),
    order_intake_paused: parsedPaused,
    order_intake_pause_message: parsedPaused ? (order_intake_pause_message ? order_intake_pause_message.trim() : null) : null,
    ...(finalPausedAt !== undefined ? { order_intake_paused_at: finalPausedAt } : {}),
    ...(finalPausedBy !== undefined ? { order_intake_paused_by: finalPausedBy } : {}),
    ...(exchangeRateSourceChanged ? { exchange_rate_source: nextSource } : {}),
  };
  // Sin las migraciones de Binance Pay o de tasas, el resto del cambio se guarda igual.
  const { error: updateError, droppedColumns } = await updateWithOptionalColumns(
    patch,
    PENDING_BRANCH_COLUMNS,
    (values) => supabaseAdmin.from("branches").update(values).eq("id", id),
    missingColumns,
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (droppedColumns.length > 0) {
    logger.warn("branch_pending_migration_columns", {
      branchId: String(id),
      columns: droppedColumns,
      detail: "Falta correr en la base el SQL de octubre de 2026 (Binance Pay y tasas de cambio): esas columnas no se guardaron.",
    });
  }
  // Sin la columna tampoco existe la tabla del historial (misma migración): no se intenta.
  if (exchangeRateSourceChanged && !droppedColumns.includes("exchange_rate_source")) {
    const { error: changeError } = await supabaseAdmin.from("branch_exchange_rate_source_changes").insert({
      company_id: ctx.companyId,
      branch_id: id,
      old_source: previousSource,
      new_source: nextSource,
      changed_by: ctx.authUserId,
    });
    // La sucursal ya quedó con la fuente nueva: el historial no debe deshacer eso.
    if (changeError) {
      logger.warn("branch_exchange_rate_source_change_not_logged", { branchId: String(id), error: changeError.message });
    }
  }

  const activePaymentMethods = Array.isArray(payment_methods)
    ? payment_methods.map((method) => String(method).trim()).filter(Boolean)
    : [];
  if (activePaymentMethods.length > 0) {
    const { data: existingDefinitions } = await supabaseAdmin
      .from("payment_methods")
      .select("method_name")
      .eq("company_id", ctx.companyId)
      .in("method_name", activePaymentMethods);
    const existingNames = new Set(
      (existingDefinitions ?? []).map((row) => row.method_name.toLowerCase()),
    );
    const missingDefinitions = activePaymentMethods
      .filter((method) => !existingNames.has(method.toLowerCase()))
      .map((method) => ({
        company_id: ctx.companyId,
        ...defaultPaymentPolicy(method),
      }));
    if (missingDefinitions.length > 0) {
      const { error: policyError } = await supabaseAdmin
        .from("payment_methods")
        .insert(missingDefinitions);
      if (policyError) {
        return NextResponse.json(
          { error: `Sucursal guardada, pero falló la política de pago: ${policyError.message}` },
          { status: 500 },
        );
      }
    }
  }

  // Purge menu cache for this tenant
  revalidateTag(`menu:${ctx.companyId}`, "max");

  // Lo demás ya quedó guardado; si lo que no entró era un cambio de verdad (datos de Binance Pay,
  // otra tasa), se avisa. 503: falta algo en el servidor (la migración), no es culpa de la petición.
  const unsaved = unsavedBranchChanges(patch, droppedColumns);
  if (unsaved.length > 0) {
    return NextResponse.json({ error: pendingBranchMigrationMessage(unsaved) }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: "Sucursal actualizada correctamente",
  });
}
