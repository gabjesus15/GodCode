"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useAutoAnimate } from "@formkit/auto-animate/react";

const FUNNEL_LABELS: Record<string, string> = {
  pending_verification: "Pend. verificación",
  email_verified: "Email verificado",
  form_completed: "Formulario listo",
  payment_pending: "Pago pendiente",
  active: "Activo",
  rejected: "Rechazado",
};

interface DashboardFunnelSectionProps {
  counts: Record<string, number>;
}

export function DashboardFunnelSection({ counts }: DashboardFunnelSectionProps) {
  const [listRef] = useAutoAnimate<HTMLUListElement>();

  const barData = Object.entries(counts)
    .map(([key, count]) => ({
      name: FUNNEL_LABELS[key] ?? key,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...barData.map((d) => d.value), 1);

  return (
    <Card className="rounded-3xl border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Embudo (todas las solicitudes)</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Conteo por estado en onboarding_applications — útil para ver cuellos de botella.
      </p>

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

      <ul ref={listRef} className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(counts).map(([key, count]) => (
          <li
            key={key}
            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <span className="text-zinc-600 dark:text-zinc-300">{FUNNEL_LABELS[key] ?? key}</span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{count}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/dashboard/onboarding-embudo"
        className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        Ver embudo interactivo →
      </Link>
    </Card>
  );
}
