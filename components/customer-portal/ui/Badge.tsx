"use client";

import {
  describeStatus,
  PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
} from "@/lib/status/status-labels";
import type { ColorVariant } from "./tokens";

const badgeClasses: Record<ColorVariant, string> = {
  accent:  "bg-indigo-50  text-indigo-700  ring-indigo-200/60",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  warning: "bg-amber-50   text-amber-700   ring-amber-200/60",
  danger:  "bg-red-50     text-red-700     ring-red-200/60",
  info:    "bg-sky-50     text-sky-700     ring-sky-200/60",
  neutral: "bg-zinc-100   text-zinc-600    ring-zinc-200/60",
};

export type BadgeProps = {
  variant?: ColorVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
};

export function Badge({ variant = "neutral", dot = false, children, className = "" }: BadgeProps) {
  const dotColorMap: Record<ColorVariant, string> = {
    accent:  "bg-indigo-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger:  "bg-red-500",
    info:    "bg-sky-500",
    neutral: "bg-zinc-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClasses[variant]} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColorMap[variant]}`} />
      )}
      {children}
    </span>
  );
}

/** Tonos del mapa común de estados (`lib/status/status-labels`), igual que en el super admin. */
export function subscriptionStatusVariant(status: string | null | undefined): ColorVariant {
  return describeStatus(SUBSCRIPTION_STATUSES, status).tone;
}

export function paymentStatusVariant(status: string | null | undefined): ColorVariant {
  return describeStatus(PAYMENT_STATUSES, status).tone;
}
