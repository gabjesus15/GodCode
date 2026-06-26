export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusBadgeConfig {
  label: string;
  variant: BadgeVariant;
}

export function companySubscriptionStatus(status: string | null | undefined): StatusBadgeConfig {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return { label: "Activa", variant: "success" };
  if (s === "suspended") return { label: "Suspendida", variant: "danger" };
  if (s === "pending") return { label: "Pendiente", variant: "warning" };
  if (s === "trial") return { label: "Trial", variant: "info" };
  return { label: status || "Desconocido", variant: "neutral" };
}

export function ticketStatus(status: string | null | undefined): StatusBadgeConfig {
  const s = String(status ?? "").toLowerCase();
  if (["open", "abierto"].includes(s)) return { label: "Abierto", variant: "info" };
  if (["in_progress", "en_progreso", "in progress"].includes(s)) return { label: "En progreso", variant: "warning" };
  if (["resolved", "resuelto"].includes(s)) return { label: "Resuelto", variant: "success" };
  if (["closed", "cerrado"].includes(s)) return { label: "Cerrado", variant: "neutral" };
  return { label: status || "Desconocido", variant: "neutral" };
}

export function ticketPriority(priority: string | null | undefined): StatusBadgeConfig {
  const p = String(priority ?? "").toLowerCase();
  if (["high", "alta"].includes(p)) return { label: "Alta", variant: "danger" };
  if (["medium", "media"].includes(p)) return { label: "Media", variant: "warning" };
  if (["low", "baja"].includes(p)) return { label: "Baja", variant: "info" };
  return { label: priority || "Sin prioridad", variant: "neutral" };
}

export function onboardingStatus(status: string | null | undefined): StatusBadgeConfig {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return { label: "Activo", variant: "success" };
  if (s === "payment_pending") return { label: "Pago pendiente", variant: "warning" };
  if (s === "form_completed") return { label: "Formulario listo", variant: "info" };
  if (s === "email_verified") return { label: "Email verificado", variant: "info" };
  if (s === "pending_verification") return { label: "Pendiente verificación", variant: "warning" };
  if (s === "rejected") return { label: "Rechazado", variant: "danger" };
  return { label: status || "Desconocido", variant: "neutral" };
}

export function paymentStatus(status: string | null | undefined): StatusBadgeConfig {
  const s = String(status ?? "").toLowerCase();
  if (["paid", "approved", "aprobado", "payment_validated"].includes(s)) return { label: "Pagado", variant: "success" };
  if (["pending_validation", "pending", "pendiente"].includes(s)) return { label: "Pendiente", variant: "warning" };
  if (["rejected", "rechazado"].includes(s)) return { label: "Rechazado", variant: "danger" };
  if (["refunded", "reembolsado"].includes(s)) return { label: "Reembolsado", variant: "neutral" };
  return { label: status || "Desconocido", variant: "neutral" };
}

export function healthAlertType(type: string | null | undefined): StatusBadgeConfig {
  const t = String(type ?? "").toLowerCase();
  if (t === "active_without_paid_payment") return { label: "Activa sin pago", variant: "danger" };
  if (t === "suspended_with_recent_paid") return { label: "Suspendida con pago reciente", variant: "warning" };
  return { label: type || "Desconocido", variant: "neutral" };
}
