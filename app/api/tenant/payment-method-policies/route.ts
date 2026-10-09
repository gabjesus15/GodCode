import { NextRequest, NextResponse } from "next/server";

import { assertPublicRateLimit } from "@/lib/infra/public-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
  resolveCompanyStorefrontAccess,
  STORE_NOT_OPEN_CODE,
  STORE_NOT_OPEN_MESSAGE,
  storefrontTakesOrders,
} from "@/lib/tenant/store-draft-viewer";

/** @service-role public
 *
 * Política de cobro que el carrito anónimo necesita para pintar el paso de pago. Una tienda
 * en vista previa o cerrada no la expone (403 `store_not_open`), salvo a su dueño en la
 * vista previa.
 */

const FALLBACK_RECEIPT_METHODS = new Set([
  "transferencia_bancaria",
  "pago_movil",
  "zelle",
  "binance_pay",
  "paypal",
]);

function fallbackPolicy(method: string) {
  const normalized = method.toLowerCase();
  const rail = ["cash", "tienda", "efectivo", "cash_usd", "cash_ves"].includes(normalized)
    ? "cash"
    : ["card", "tarjeta", "stripe", "mercadopago"].includes(normalized)
      ? "card"
      : "online";
  return {
    rail,
    settlementTrigger: rail === "cash"
      ? "cash_confirmation"
      : ["card", "tarjeta"].includes(normalized)
        ? "pos_confirmation"
        : ["stripe", "mercadopago"].includes(normalized)
          ? "gateway_webhook"
          : FALLBACK_RECEIPT_METHODS.has(normalized)
            ? "evidence_uploaded"
            : "manual_verification",
  };
}

export async function GET(req: NextRequest) {
  const limited = await assertPublicRateLimit(
    req,
    "tenant_payment_method_policies",
    30,
    60_000,
  );
  if (limited) return limited;

  const branchId = req.nextUrl.searchParams.get("branchId")?.trim();
  if (!branchId) {
    return NextResponse.json({ error: "Falta branchId." }, { status: 400 });
  }

  const { data: branch, error: branchError } = await supabaseAdmin
    .from("branches")
    .select("company_id, payment_methods")
    .eq("id", branchId)
    .eq("is_active", true)
    .maybeSingle();
  if (branchError || !branch?.company_id) {
    return NextResponse.json({ error: "Sucursal no encontrada." }, { status: 404 });
  }

  // Una tienda sin publicar o cerrada no cobra: sus métodos de pago no se exponen (el
  // dueño en vista previa sí los ve, con su sesión).
  let access: Awaited<ReturnType<typeof resolveCompanyStorefrontAccess>>;
  try {
    access = await resolveCompanyStorefrontAccess(String(branch.company_id));
  } catch (error) {
    console.error("[payment-method-policies] acceso de la tienda", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "No se pudo cargar la forma de pago. Intenta nuevamente." }, { status: 500 });
  }
  if (!storefrontTakesOrders(access)) {
    return NextResponse.json({ error: STORE_NOT_OPEN_MESSAGE, code: STORE_NOT_OPEN_CODE }, { status: 403 });
  }

  const enabled = Array.isArray(branch.payment_methods)
    ? branch.payment_methods.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const { data: configured } = enabled.length > 0
    ? await supabaseAdmin
      .from("payment_methods")
      .select("method_name, requires_receipt, is_active, rail, settlement_trigger, settlement_currency, allow_mixed_payment")
      .eq("company_id", branch.company_id)
      .in("method_name", enabled)
    : { data: [] };

  const definitions = new Map(
    (configured ?? [])
      .filter((row) => row.is_active)
      .map((row) => [
        String(row.method_name).toLowerCase(),
        row,
      ]),
  );

  return NextResponse.json({
    methods: enabled.map((method) => {
      const definition = definitions.get(method.toLowerCase());
      const fallback = fallbackPolicy(method);
      return {
        id: method,
        requiresReceipt: definition
          ? Boolean(definition.requires_receipt)
          : FALLBACK_RECEIPT_METHODS.has(method.toLowerCase()),
        rail: definition?.rail || fallback.rail,
        settlementTrigger: definition?.settlement_trigger || fallback.settlementTrigger,
        settlementCurrency: definition?.settlement_currency || null,
        allowMixedPayment: definition?.allow_mixed_payment !== false,
      };
    }),
  });
}
