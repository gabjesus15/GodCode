import type { StatusTone } from "@/lib/status/status-labels";
import { cn } from "@/utils/cn";

interface SaasStatusBadgeProps {
  label: string;
  variant?: StatusTone;
  className?: string;
}

const variants: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

/** Nombres y tonos: `lib/super-admin/status-maps` (mapa común con el portal). */
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
