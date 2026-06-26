import { cn } from "@/utils/cn";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface SaasStatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  danger:
    "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  info:
    "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  neutral:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function SaasStatusBadge({ label, variant = "neutral", className }: SaasStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        variants[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

// Helpers semánticos comunes
export function subscriptionStatusBadge(status: string | null | undefined): {
  label: string;
  variant: BadgeVariant;
} {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return { label: "Activa", variant: "success" };
  if (s === "suspended") return { label: "Suspendida", variant: "danger" };
  if (s === "pending") return { label: "Pendiente", variant: "warning" };
  if (s === "trial") return { label: "Trial", variant: "info" };
  return { label: status || "Desconocido", variant: "neutral" };
}

export function ticketPriorityBadge(priority: string | null | undefined): {
  label: string;
  variant: BadgeVariant;
} {
  const p = String(priority ?? "").toLowerCase();
  if (p === "high" || p === "alta") return { label: "Alta", variant: "danger" };
  if (p === "medium" || p === "media") return { label: "Media", variant: "warning" };
  if (p === "low" || p === "baja") return { label: "Baja", variant: "info" };
  return { label: priority || "Sin prioridad", variant: "neutral" };
}

export function ticketStatusBadge(status: string | null | undefined): {
  label: string;
  variant: BadgeVariant;
} {
  const s = String(status ?? "").toLowerCase();
  if (s === "open" || s === "abierto") return { label: "Abierto", variant: "info" };
  if (s === "in_progress" || s === "en_progreso") return { label: "En progreso", variant: "warning" };
  if (s === "resolved" || s === "resuelto") return { label: "Resuelto", variant: "success" };
  if (s === "closed" || s === "cerrado") return { label: "Cerrado", variant: "neutral" };
  return { label: status || "Desconocido", variant: "neutral" };
}
