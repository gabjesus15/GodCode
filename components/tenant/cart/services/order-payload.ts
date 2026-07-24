function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseOrderRpcPayload(data: unknown): {
  id: number;
  order_number: number | null;
  handoff_code: string | null;
} | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  // orders.id is Postgres bigint — may arrive as number, string, or bigint.
  const id = toFiniteNumber(o.id);
  if (id == null) return null;
  const order_number = toFiniteNumber(o.order_number);
  const handoff_code = typeof o.handoff_code === "string" ? o.handoff_code : null;
  return {
    id,
    order_number,
    handoff_code,
  };
}
