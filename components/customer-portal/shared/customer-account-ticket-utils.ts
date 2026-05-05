import type { TicketSummary } from "./customer-account-types";

export function getTicketSlaHours(priority: TicketSummary["priority"]): number {
  if (priority === "critical") return 2;
  if (priority === "high") return 6;
  if (priority === "medium") return 12;
  return 24;
}

export function getTicketAgeHours(iso: string): number | null {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, (Date.now() - ms) / (1000 * 60 * 60));
}
