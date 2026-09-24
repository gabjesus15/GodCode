"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { describeStatus, ONBOARDING_STATUSES } from "@/lib/status/status-labels";

/** Orden del alta, de la primera a la última etapa (antes se ordenaba por cantidad). */
const STAGE_ORDER = ["pending_verification", "email_verified", "form_completed", "payment_pending", "payment_validated", "active", "rejected", "expired"];

interface DashboardFunnelSectionProps {
  counts: Record<string, number>;
}

export function DashboardFunnelSection({ counts }: DashboardFunnelSectionProps) {
  const rank = (key: string) => {
    const index = STAGE_ORDER.indexOf(key);
    return index === -1 ? STAGE_ORDER.length : index;
  };
  const barData = Object.entries(counts)
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([key, count]) => ({ name: describeStatus(ONBOARDING_STATUSES, key).label, value: count }));

  const maxValue = Math.max(...barData.map((d) => d.value), 1);

  return (
    <Card className="rounded-3xl border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Solicitudes de alta por etapa</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Todas las solicitudes, para ver en qué paso se quedan.</p>

      <div className="mt-5 space-y-3">
        {barData.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
              <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{item.value.toLocaleString("es-CL")}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/onboarding-embudo"
        className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        Ver embudo interactivo →
      </Link>
    </Card>
  );
}
