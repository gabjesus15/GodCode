"use client";

import { useQuery } from "@tanstack/react-query";

export type DeliveryQuoteResult = {
  ok: boolean;
  fee: number;
  waivedFree: boolean;
  namedLabel?: string | null;
  quotedRouteKm?: number | null;
  outOfZone: boolean;
  uberQuoteId?: string | null;
  error?: string | null;
};

/**
 * Hook de React Query para cotizar envíos.
 * Consolida las 4 cotizaciones (manual, GPS, zonas nombradas y Uber Direct).
 */
export function useDeliveryQuote(params: {
  branchId: string | null | undefined;
  fulfillment: string;
  pricingMode: "distance" | "named" | "external";
  addressLine: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  namedAreaId: string | null | undefined;
  subtotal: number;
  minOrderSubtotal?: number | null;
  maxDeliveryKm?: number | null;
  namedAreaResolution?: string;
  enabledSettings?: boolean;
  checkoutActive?: boolean;
}) {
  const isDelivery = params.fulfillment === "delivery";
  const hasBranch = !!params.branchId;
  const checkoutActive = params.checkoutActive !== false;
  const isEnabled = isDelivery && hasBranch && params.enabledSettings !== false && checkoutActive;

  // Validar si el subtotal cumple con el pedido mínimo antes de consultar
  const minOk =
    params.minOrderSubtotal == null || params.subtotal >= params.minOrderSubtotal;

  const canFetch =
    isEnabled &&
    minOk &&
    (params.pricingMode === "external"
      ? typeof params.lat === "number" && typeof params.lng === "number"
      : params.pricingMode === "named"
        ? params.namedAreaResolution === "address_matched"
          ? params.addressLine.trim().length >= 8
          : !!params.namedAreaId
        : typeof params.lat === "number" && typeof params.lng === "number");

  const queryKey = [
    "delivery-quote",
    params.branchId,
    params.pricingMode,
    params.addressLine,
    params.lat,
    params.lng,
    params.namedAreaId,
    params.subtotal,
  ];

  return useQuery<DeliveryQuoteResult>({
    queryKey,
    queryFn: async () => {
      const body: Record<string, unknown> = {
        branchId: params.branchId,
        subtotal: params.subtotal,
      };

      if (params.pricingMode === "named") {
        if (params.namedAreaResolution === "address_matched") {
          body.address = params.addressLine;
        } else {
          body.namedAreaId = params.namedAreaId;
        }
      } else {
        body.lat = params.lat;
        body.lng = params.lng;
        if (params.pricingMode === "external" && params.addressLine.trim().length >= 8) {
          body.address = params.addressLine;
        }
      }

      const res = await fetch("/api/geo/delivery-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const errMessage = data.error || "No se pudo cotizar el envío.";
        const isOutOfZone = /distancia fuera|fuera del m[aá]ximo|m[aá]ximo permitido/i.test(errMessage);
        return {
          ok: false,
          fee: 0,
          waivedFree: false,
          outOfZone: isOutOfZone,
          error: errMessage,
        };
      }

      return {
        ok: true,
        fee: Math.round(Number(data.fee) || 0),
        waivedFree: Boolean(data.waivedFreeShipping),
        namedLabel: data.label || null,
        quotedRouteKm: data.distanceKm != null ? Math.round(data.distanceKm) : null,
        outOfZone: false,
        uberQuoteId: data.uberQuoteId || null,
      };
    },
    enabled: canFetch,
    staleTime: 60_000, // conservar cotización fresca por 1 minuto
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}
