import { formatUsd } from "@/lib/billing/portal-pricing";
import {
  BRANCH_ENTITLEMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "./customer-account-constants";

/** Formato de fecha con soporte opcional de zona horaria. */
export function fmtDate(iso: string | null | undefined, timezone?: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  if (timezone) {
    try {
      return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
        hour12: false,
      }).format(date);
    } catch {
      // Fallback to UTC if timezone is invalid
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(date.getUTCDate());
  const month = pad(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${day}-${month}-${year}, ${hours}:${minutes} UTC`;
}

export function formatPaymentConfigKey(key: string): string {
  const normalized = String(key ?? "").trim().replace(/[_-]+/g, " ");
  if (!normalized) return "Dato";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** Montos del SaaS (plan, extras, pagos a Gcode): siempre en dólares. */
export function fmtUsd(value: number | null | undefined, locale = "es-CL"): string {
  return formatUsd(value, locale);
}

/** Solo fecha (sin hora), para vencimientos y fechas de cobro. */
export function fmtDay(iso: string | null | undefined, timezone?: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  try {
    return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: timezone || "UTC" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
}

/**
 * Etiqueta legible para valores de estado (claves en minúsculas).
 * Misma semántica que el helper histórico del portal.
 */
export function displayStatus(value: string | null | undefined, labels: Record<string, string>): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "Sin estado";
  return labels[normalized] ?? normalized.replace(/_/g, " ");
}

export function paymentStatusLabel(status: string | null | undefined): string {
  return displayStatus(status, PAYMENT_STATUS_LABELS);
}

export function branchEntitlementStatusLabel(status: string | null | undefined): string {
  return displayStatus(status, BRANCH_ENTITLEMENT_STATUS_LABELS);
}
