"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

export type CouponPreviewResult = {
  ok: boolean;
  discountAmount: number;
  normalizedCode?: string;
  minSubtotal?: number;
  error?: string;
};

/**
 * Hook de React Query para obtener el descuento calculado de un cupón en segundo plano.
 * Se gatilla automáticamente si cambia el subtotal del carrito o el código aplicado.
 */
export function useCouponPreview(params: {
  branchId: string | null | undefined;
  code: string | null | undefined;
  subtotal: number;
  clientPhone?: string | null;
}) {
  const codeTrimmed = params.code?.trim() || "";
  const canFetch = Boolean(params.branchId && codeTrimmed.length > 0 && params.subtotal > 0);

  return useQuery<CouponPreviewResult>({
    queryKey: [
      "coupon-preview",
      params.branchId,
      codeTrimmed.toUpperCase(),
      params.subtotal,
      params.clientPhone?.trim() || "",
    ],
    queryFn: async () => {
      const res = await fetch("/api/geo/discount-coupon-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: params.branchId,
          code: codeTrimmed,
          subtotal: Math.round(params.subtotal),
          ...(params.clientPhone?.trim() ? { clientPhone: params.clientPhone.trim() } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Error al validar el cupón");
      }
      return data;
    },
    enabled: canFetch,
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * Mutation para aplicar manualmente un cupón de descuento en el checkout.
 */
export function useApplyCoupon() {
  return useMutation<
    CouponPreviewResult,
    Error,
    {
      branchId: string;
      code: string;
      subtotal: number;
      clientPhone?: string | null;
    }
  >({
    mutationFn: async (vars) => {
      const res = await fetch("/api/geo/discount-coupon-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: vars.branchId,
          code: vars.code,
          subtotal: Math.round(vars.subtotal),
          ...(vars.clientPhone?.trim() ? { clientPhone: vars.clientPhone.trim() } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        // Retornamos el payload para que el llamador lea el código de error detallado
        return data;
      }
      return data;
    },
  });
}
