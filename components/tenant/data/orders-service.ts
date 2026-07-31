import { createSupabaseBrowserClient } from "../../../utils/supabase/client";
import { uploadImage } from "@/lib/storage/upload-image-client";
import {
	computeDeliveryFee,
	effectiveDeliveryPricingMode,
	normalizeDeliverySettings,
} from "@/lib/delivery/delivery-settings";
import type { Json } from "../../../types/supabase-database";

import {
	buildOrderItemsFromBranch,
	isCatalogOrderLine,
	normalizeExtrasPayload,
	type OrderCatalogLine,
} from "./orders/build-order-items-from-branch";
import { mergeCustomLinesForRpc } from "@/lib/orders/merge-custom-lines-for-rpc";
import {
	buildMenuOrderPaymentPayload,
	paymentMethodRequiresReceipt,
} from "../cart/services/menu-order-payment";

interface CreateOrderPayload {
  client_name: string;
  client_phone: string;
  client_rut?: string;
  payment_type?: "pendiente" | "online" | "tienda" | null;
  payment_method_specific?: string | null;
  total: number;
  items: OrderCatalogLine[];
  note?: string | null;
  status?: string;
  receiptFile?: File | null;
  branch_id: string;
  branch_name?: string | null;
  company_id?: string | null;
  payment_ref?: string | null;
  order_type?: "pickup" | "delivery";
  delivery_address?: Record<string, unknown> | null;
  delivery_fee?: number;
  /** Km declarados (distancia) o último km cotizado en cliente. */
  delivery_km?: number;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_named_area_id?: string | null;
  namedAreaId?: string | null;
  /** Cotización Uber Direct (opcional; se revalida en servidor). */
  uber_quote_id?: string | null;
  /** Código de cupón (`discount_coupons`); lo valida `create_order_transaction`. */
  coupon_code?: string | null;
  /**
   * Origen del pedido para el RPC (`p_order_origin`).
   * `web` marca `channel = online` (compra online en panel del negocio).
   */
  order_origin?: "web" | null;
  client_request_id?: string;
  currency?: string | null;
  requires_receipt?: boolean;
}

/** Pedidos creados desde el menú / carrito del tenant. */
export const WEB_MENU_ORDER_ORIGIN = "web" as const;

const UNAVAILABLE_BRANCH_ITEMS_MESSAGE =
	"Hay productos del carrito que no estan disponibles para esta sucursal. Actualiza el menu e intenta nuevamente.";

const STALE_CART_MESSAGE =
	"Tu carrito quedo desactualizado. Vacia el carrito, recarga el menu y vuelve a agregar los productos.";

const TOTAL_MISMATCH_MESSAGE =
	"No pudimos confirmar el total del pedido. Revisa delivery y extras, o vacia el carrito e intenta de nuevo.";

async function resolveCouponDiscountForOrder(
	branchId: string,
	couponCode: string,
	subtotal: number,
	clientPhone: string,
): Promise<number> {
	if (typeof window === "undefined") return 0;

	const res = await fetch(`${window.location.origin}/api/geo/discount-coupon-preview`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			branchId,
			code: couponCode,
			subtotal,
			clientPhone,
		}),
	});
	const json = (await res.json().catch(() => ({}))) as {
		ok?: boolean;
		discountAmount?: number;
	};
	if (!res.ok || !json.ok) return 0;

	return Math.max(0, Number(json.discountAmount) || 0);
}

async function resolveNormalizedCatalogItems(
	branchId: string,
	items: OrderCatalogLine[],
): Promise<OrderCatalogLine[]> {
	if (typeof window !== "undefined") {
		const res = await fetch(`${window.location.origin}/api/tenant/order-catalog-items`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ branchId, items }),
		});
		const json = (await res.json().catch(() => ({}))) as {
			ok?: boolean;
			items?: OrderCatalogLine[];
			error?: string;
		};
		if (!res.ok || !json.ok || !Array.isArray(json.items)) {
			throw new Error(
				json.error || "No se pudo validar los productos de la sucursal. Intenta nuevamente.",
			);
		}
		return json.items;
	}

	const supabase = createSupabaseBrowserClient("tenant");
	return buildOrderItemsFromBranch(supabase, branchId, items);
}

function extractOrderId(newOrder: unknown): string | null {
  if (newOrder == null) return null;
  if (typeof newOrder === "string") return newOrder;
  if (typeof newOrder === "object") {
    const o = newOrder as Record<string, unknown>;
    const id = o.id ?? o.order_id;
    return id != null ? String(id) : null;
  }
  return null;
}

function isDeliveryOrderType(raw: unknown): boolean {
  const t = String(raw ?? "pickup").trim().toLowerCase();
  return t === "delivery" || t === "envio" || t === "envío" || t === "despacho";
}

export const ordersService = {
  async createOrder(orderData: CreateOrderPayload, receiptFile: File | null = null) {
    const supabase = createSupabaseBrowserClient("tenant");

    if (!orderData.branch_id) {
      throw new Error("El ID de sucursal es obligatorio para crear un pedido.");
    }

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error("El pedido debe contener al menos un producto.");
    }

    const normalizedItems = await resolveNormalizedCatalogItems(
      orderData.branch_id,
      orderData.items
    );

    const customItems = (orderData.items ?? [])
      .filter((it) => it.custom_item === true)
      .map((it, idx) => ({
        id: String(it.id ?? `custom_${idx}`),
        name: String(it.name ?? "Extra"),
        quantity: Math.max(1, Number(it.quantity) || 1),
        price: Math.max(0, Math.round(Number(it.price) || 0)),
        has_discount: false,
        discount_price: null,
        description: it.description ?? null,
        extras_total: 0,
        extras: normalizeExtrasPayload(it.extras),
        custom_item: true as const,
      }));

    const requestedCatalogLines = (orderData.items ?? []).filter(isCatalogOrderLine);
    if (requestedCatalogLines.length > normalizedItems.length) {
      throw new Error(
        normalizedItems.length === 0 ? STALE_CART_MESSAGE : UNAVAILABLE_BRANCH_ITEMS_MESSAGE,
      );
    }

    const itemsForRpc = mergeCustomLinesForRpc(normalizedItems, customItems);

    if (itemsForRpc.length === 0) {
      throw new Error(
        "Ningun producto del carrito esta disponible en esta sucursal en este momento."
      );
    }

    const { data: openShift } = await supabase
      .from("cash_shifts")
      .select("id")
      .eq("status", "open")
      .eq("branch_id", orderData.branch_id)
      .maybeSingle();

    if (!openShift) {
      throw new Error(
        "El local no esta recibiendo pedidos en este momento (Caja Cerrada)."
      );
    }

    const calculatedItemsTotal = Math.round(
      itemsForRpc.reduce((sum, item) => {
        const price =
          item.has_discount && item.discount_price && Number(item.discount_price) > 0
            ? Number(item.discount_price)
            : Number(item.price || 0);
        const extrasTotal = Math.max(0, Number(item.extras_total) || 0);
        const qty = Math.max(1, Number(item.quantity) || 1);
        return sum + (price + extrasTotal) * qty;
      }, 0)
    );

    const { data: branchCfg, error: branchCfgError } = await supabase
      .from("branches")
      .select("delivery_settings, order_intake_paused, order_intake_pause_message")
      .eq("id", orderData.branch_id)
      .maybeSingle();

    if (branchCfgError) {
      throw new Error("No se pudo validar la configuracion de la sucursal. Intenta nuevamente.");
    }

    if (branchCfg?.order_intake_paused) {
      throw new Error(
        branchCfg.order_intake_pause_message?.trim() ||
        "Tenemos mucha demanda por el momento. Vuelve a intentar en unos minutos."
      );
    }

    const deliverySettings = normalizeDeliverySettings(branchCfg?.delivery_settings);
    const deliveryMode = isDeliveryOrderType(orderData.order_type);

    const MIN_DRIVER_REFERENCE_LEN = 6;

    let deliveryFee = 0;
    let uberQuoteIdForPatch: string | null =
      typeof orderData.uber_quote_id === "string" && orderData.uber_quote_id.trim()
        ? orderData.uber_quote_id.trim()
        : null;
    let namedId: string | null =
      typeof orderData.delivery_named_area_id === "string" && orderData.delivery_named_area_id.trim()
        ? orderData.delivery_named_area_id.trim()
        : typeof orderData.namedAreaId === "string" && orderData.namedAreaId.trim()
          ? orderData.namedAreaId.trim()
          : null;

    if (deliveryMode) {
      if (!deliverySettings.enabled) {
        throw new Error("El delivery no esta habilitado para esta sucursal.");
      }

      const daRef = orderData.delivery_address;
      const refForDriver =
        daRef && typeof daRef === "object"
          ? String((daRef as Record<string, unknown>).reference ?? "").trim()
          : "";
      if (refForDriver.length < MIN_DRIVER_REFERENCE_LEN) {
        throw new Error(
          "Agrega indicaciones para el repartidor (depto, timbre, color de porton, etc.). Minimo 6 caracteres.",
        );
      }

      const km = Number(orderData.delivery_km);
      const safeKm = Number.isFinite(km) && km >= 0 ? km : 0;
      const priceMode = effectiveDeliveryPricingMode(deliverySettings);

      if (priceMode === "named" && deliverySettings.namedAreaResolution === "address_matched") {
        const da = orderData.delivery_address;
        const addr =
          da && typeof da === "object"
            ? String(da.address ?? da.formatted_address ?? "").trim()
            : "";
        if (addr.length < 8) {
          throw new Error("Completa la direccion de entrega (calle, numero y comuna o ciudad).");
        }
        if (typeof window === "undefined") {
          throw new Error("Cotizacion por direccion no disponible en este contexto.");
        }
        const geoRes = await fetch(`${window.location.origin}/api/geo/delivery-geocode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId: orderData.branch_id,
            address: addr,
            subtotal: calculatedItemsTotal,
          }),
        });
        const geoJson = (await geoRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          namedAreaId?: string;
          label?: string;
        };
        if (!geoRes.ok || !geoJson.ok) {
          throw new Error(geoJson.error || "No se pudo calcular el envio segun la direccion.");
        }
        namedId = geoJson.namedAreaId ?? null;
        if (da && typeof da === "object") {
          orderData.delivery_address = {
            ...da,
            named_area_id: namedId,
            named_area_label: geoJson.label,
          };
        }
      }

      if (priceMode === "named") {
        const r = computeDeliveryFee(deliverySettings, 0, calculatedItemsTotal, {
          namedAreaId: namedId,
        });
        if (r.fee === -2) {
          throw new Error("El subtotal del pedido no alcanza el minimo requerido para delivery.");
        }
        if (r.fee === -3) {
          throw new Error("Debes elegir una zona de entrega.");
        }
        if (r.fee === -4) {
          throw new Error("La zona de entrega seleccionada no es valida.");
        }
        deliveryFee = Math.round(Number(r.fee < 0 ? 0 : r.fee) || 0);
      } else if (priceMode === "external") {
        const dlat = orderData.delivery_lat;
        const dlng = orderData.delivery_lng;
        const hasLatLng =
          typeof dlat === "number" &&
          typeof dlng === "number" &&
          Number.isFinite(dlat) &&
          Number.isFinite(dlng);
        if (!hasLatLng) {
          throw new Error(
            "Indica tu ubicacion de entrega en el mapa para continuar con el envio.",
          );
        }
        if (typeof window === "undefined") {
          throw new Error("Cotizacion de envio externo no disponible en este contexto.");
        }
        const da = orderData.delivery_address;
        const addrStr =
          da && typeof da === "object"
            ? String(
                (da as Record<string, unknown>).formatted_address ??
                  (da as Record<string, unknown>).address ??
                  "",
              ).trim()
            : "";
        const qRes = await fetch(`${window.location.origin}/api/geo/delivery-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId: orderData.branch_id,
            subtotal: calculatedItemsTotal,
            lat: dlat,
            lng: dlng,
            ...(addrStr.length >= 8 ? { address: addrStr } : {}),
          }),
        });
        const qJson = (await qRes.json().catch(() => ({}))) as {
          ok?: boolean;
          fee?: number;
          showDeliveryFeeAmount?: boolean;
          uberQuoteId?: string | null;
          error?: string;
        };
        if (!qRes.ok || !qJson.ok) {
          throw new Error(
            qJson.error ||
              "No se pudo validar el envio con el proveedor. Verifica tu ubicacion e intenta de nuevo.",
          );
        }
        const showAmt = qJson.showDeliveryFeeAmount !== false;
        deliveryFee = showAmt ? Math.round(Math.max(0, Number(qJson.fee) || 0)) : 0;
        uberQuoteIdForPatch = showAmt
          ? typeof qJson.uberQuoteId === "string" && qJson.uberQuoteId.trim()
            ? qJson.uberQuoteId.trim()
            : uberQuoteIdForPatch
          : uberQuoteIdForPatch;
      } else {
        const dlat = orderData.delivery_lat;
        const dlng = orderData.delivery_lng;
        const hasLatLng =
          typeof dlat === "number" &&
          typeof dlng === "number" &&
          Number.isFinite(dlat) &&
          Number.isFinite(dlng);

        if (hasLatLng && typeof window !== "undefined") {
          const qRes = await fetch(`${window.location.origin}/api/geo/delivery-quote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              branchId: orderData.branch_id,
              subtotal: calculatedItemsTotal,
              lat: dlat,
              lng: dlng,
            }),
          });
          const qJson = (await qRes.json().catch(() => ({}))) as {
            ok?: boolean;
            fee?: number;
            error?: string;
          };
          if (!qRes.ok || !qJson.ok) {
            throw new Error(
              qJson.error ||
                "No se pudo validar el envio por distancia. Verifica que estes dentro del area de reparto.",
            );
          }
          deliveryFee = Math.round(Math.max(0, Number(qJson.fee) || 0));
        } else {
          if (
            deliverySettings.maxDeliveryKm != null &&
            safeKm > deliverySettings.maxDeliveryKm + 1e-9
          ) {
            throw new Error(
              "La distancia indicada supera el maximo permitido para delivery en esta sucursal.",
            );
          }
          const kmBilled = Math.max(0, Math.round(safeKm));
          const r = computeDeliveryFee(deliverySettings, kmBilled, calculatedItemsTotal);
          if (r.fee === -1) {
            throw new Error(
              "La distancia indicada supera el maximo permitido para delivery en esta sucursal.",
            );
          }
          if (r.fee === -2) {
            throw new Error("El subtotal del pedido no alcanza el minimo requerido para delivery.");
          }
          if (r.fee === -3) {
            throw new Error("Debes elegir una zona de entrega.");
          }
          if (r.fee === -4) {
            throw new Error("La zona de entrega seleccionada no es valida.");
          }
          deliveryFee = Math.round(Number(r.fee < 0 ? 0 : r.fee) || 0);
        }
      }
    }

    deliveryFee = Math.round(Number(deliveryFee) || 0);
    const serverItemsPlusDelivery = calculatedItemsTotal + deliveryFee;

    const couponRaw =
      typeof orderData.coupon_code === "string" ? orderData.coupon_code.trim() : "";
    const couponPayload = couponRaw.length > 0 ? couponRaw : null;

    // `p_total` debe coincidir con el RPC (ítems + envío − cupón, sin IVA del cliente).
    let totalToUse = serverItemsPlusDelivery;
    if (couponPayload) {
      const couponDiscount = await resolveCouponDiscountForOrder(
        orderData.branch_id,
        couponPayload,
        calculatedItemsTotal,
        orderData.client_phone,
      );
      totalToUse = Math.round(
        Math.max(0, calculatedItemsTotal - couponDiscount) + deliveryFee,
      );
    }

    const paymentMethod = String(orderData.payment_method_specific ?? "").trim();
    if (!paymentMethod) {
      throw new Error("Debes seleccionar un metodo de pago para confirmar el pedido.");
    }

    const needsReceipt = orderData.requires_receipt
      ?? paymentMethodRequiresReceipt(paymentMethod);
    if (needsReceipt && !receiptFile) {
      throw new Error("Debes adjuntar el comprobante de pago para confirmar el pedido.");
    }

    let receiptUrl: string | null = null;
    if (needsReceipt) {
      try {
        receiptUrl = await uploadImage(receiptFile!, "receipts");
      } catch {
        throw new Error("No se pudo subir el comprobante. Intenta nuevamente.");
      }
      if (!receiptUrl) {
        throw new Error("No se pudo subir el comprobante. Intenta nuevamente.");
      }
    }

    const menuPayment = buildMenuOrderPaymentPayload(paymentMethod, receiptUrl);
    const paymentRef = orderData.payment_ref?.trim() || menuPayment.payment_ref;
    const paymentType = orderData.payment_type ?? menuPayment.payment_type;

    let finalNote = orderData.note || "";
    if (orderData.branch_name) {
      finalNote = `[Sucursal: ${orderData.branch_name}] \n${finalNote}`.trim();
    }
    if (deliveryMode && deliveryFee > 0) {
      finalNote = `${finalNote}\n[Envio: $${Math.round(deliveryFee).toLocaleString("es-CL")}]`.trim();
    }

    const rpcArgs = {
      p_client_name: orderData.client_name,
      p_client_phone: orderData.client_phone,
      p_client_rut: orderData.client_rut || "",
      p_items: itemsForRpc,
      p_total: totalToUse,
      p_payment_type: paymentType,
      p_payment_ref: paymentRef,
      p_note: finalNote,
      p_branch_id: orderData.branch_id,
      p_company_id: orderData.company_id || null,
      p_status: orderData.status || "pending",
      p_payment_method_specific: menuPayment.payment_method_specific,
      // Sin estos campos el RPC asume pickup + fee 0 y compara mal `p_total` (subtotal+envío) → invalid_item_price.
      p_order_type: deliveryMode ? "delivery" : "pickup",
      p_delivery_fee: deliveryMode ? deliveryFee : 0,
      p_delivery_address: deliveryMode ? (orderData.delivery_address as Json) : null,
      ...(couponPayload ? { p_coupon_code: couponPayload } : {}),
      p_order_origin: orderData.order_origin ?? WEB_MENU_ORDER_ORIGIN,
    };

    const { data: newOrder, error: orderError } = await supabase.rpc(
      "create_order_transaction",
      rpcArgs
    );

    if (orderError) {
      const rpcMessage = String(orderError.message || "").toLowerCase();
      if (rpcMessage.includes("invalid_coupon")) {
        throw new Error("Cupón no válido.");
      }
      if (rpcMessage.includes("coupon_expired")) {
        throw new Error("Este cupón ya no está vigente.");
      }
      if (rpcMessage.includes("coupon_min_subtotal")) {
        throw new Error("El subtotal no alcanza el mínimo para usar este cupón.");
      }
      if (rpcMessage.includes("coupon_wrong_client")) {
        throw new Error("Este cupón no aplica para tu cuenta.");
      }
      if (rpcMessage.includes("coupon_phone_required")) {
        throw new Error("Este cupón requiere identificar tu teléfono.");
      }
      if (
        rpcMessage.includes("coupon_usage_exhausted") ||
        rpcMessage.includes("coupon_usage_exhausted_client")
      ) {
        throw new Error("Este cupón ya fue utilizado el máximo de veces permitidas.");
      }
      if (rpcMessage.includes("invalid_item_price")) {
        throw new Error(TOTAL_MISMATCH_MESSAGE);
      }
      if (rpcMessage.includes("no_items_available")) {
        throw new Error(
          "Ningun producto del carrito esta disponible en esta sucursal en este momento."
        );
      }
      if (rpcMessage.includes("delivery_address_required")) {
        throw new Error("Falta la direccion de entrega. Completa el formulario de delivery.");
      }
      if (rpcMessage.includes("handoff_code_collision")) {
        throw new Error("No se pudo generar el codigo de entrega. Intenta nuevamente.");
      }
      throw orderError;
    }

    const orderId = extractOrderId(newOrder);
    if (orderId && typeof window !== "undefined") {
      const patchRes = await fetch(`${window.location.origin}/api/tenant/public-order-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          orderType: deliveryMode ? "delivery" : "pickup",
          deliveryKm: deliveryMode ? Number(orderData.delivery_km) : 0,
          deliveryFee: deliveryMode ? deliveryFee : 0,
          deliveryAddress: deliveryMode ? (orderData.delivery_address ?? null) : null,
          deliveryLat: deliveryMode ? orderData.delivery_lat : null,
          deliveryLng: deliveryMode ? orderData.delivery_lng : null,
          namedAreaId:
            deliveryMode && typeof namedId === "string" && namedId.trim()
              ? namedId.trim()
              : undefined,
          ...(deliveryMode && uberQuoteIdForPatch ? { uberQuoteId: uberQuoteIdForPatch } : {}),
        }),
      });
      if (!patchRes.ok) {
        const j = (await patchRes.json().catch(() => ({}))) as { error?: string; message?: string };
        // Compensate orphan order created by RPC before delivery/tax patch failed.
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            note: `[AUTO-CANCEL] Fallo post-creacion: ${j.error || j.message || "patch"}`,
          })
          .eq("id", orderId);
        const msg = j.error === "ORDER_INTAKE_PAUSED"
          ? (j.message || "Tenemos mucha demanda por el momento. Vuelve a intentar en unos minutos.")
          : (j.error || "No se pudo registrar los datos de facturación del pedido.");
        throw new Error(msg);
      }
    }

    return { order: newOrder, receiptUploadFailed: false, paymentStatus: null, evidenceStatus: null };
  },
};
