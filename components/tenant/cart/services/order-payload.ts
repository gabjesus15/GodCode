export function parseOrderRpcPayload(data: unknown): {
  id: number;
  order_number: number | null;
  handoff_code: string | null;
} | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;
  const order_number =
    o.order_number != null && o.order_number !== "" ? Number(o.order_number) : null;
  const handoff_code = typeof o.handoff_code === "string" ? o.handoff_code : null;
  return {
    id,
    order_number: order_number != null && Number.isFinite(order_number) ? order_number : null,
    handoff_code,
  };
}
