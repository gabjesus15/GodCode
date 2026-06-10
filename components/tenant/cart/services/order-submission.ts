"use client";

import { useMutation } from "@tanstack/react-query";
import { type OrderCatalogLine } from "../../data/orders/build-order-items-from-branch";
import { ordersService } from "../../data/orders-service";

export type SubmitOrderParams = {
  client_name: string;
  client_phone: string;
  client_rut?: string;
  payment_type: "online" | "tienda" | null;
  payment_method_specific?: string | null;
  total: number;
  items: OrderCatalogLine[];
  note?: string | null;
  status?: string;
  branch_id: string;
  branch_name?: string | null;
  company_id?: string | null;
  payment_ref?: string | null;
  order_type?: "pickup" | "delivery";
  delivery_address?: Record<string, unknown> | null;
  delivery_fee?: number;
  delivery_km?: number;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_named_area_id?: string | null;
  uber_quote_id?: string | null;
  coupon_code?: string | null;
  order_origin?: "web" | null;
};

/**
 * Hook de React Query para procesar el envío de un pedido (checkout).
 */
export function useSubmitOrder() {
  return useMutation({
    mutationFn: async (variables: {
      orderData: SubmitOrderParams;
      receiptFile?: File | null;
    }) => {
      return await ordersService.createOrder(variables.orderData, variables.receiptFile ?? null);
    },
  });
}
