"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { SaasMetricCard } from "@/components/super-admin/shared/saas-metric-card";
import { SaasDataTable } from "@/components/super-admin/shared/saas-data-table";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";
import { useSaasBreakpoint } from "@/components/super-admin/shared/use-saas-breakpoint";
import { Drawer } from "@/components/ui/drawer";
import type { PaymentHealthRow } from "@/lib/super-admin/super-admin-metrics";
import { healthAlertType } from "@/lib/super-admin/status-maps";

interface SaludPagosClientProps {
  rows: PaymentHealthRow[];
  error: string | null;
}

export function SaludPagosClient({ rows, error }: SaludPagosClientProps) {
  const [filter, setFilter] = useState<"all" | PaymentHealthRow["type"]>("all");
  const [selected, setSelected] = useState<PaymentHealthRow | null>(null);
  const [listRef] = useSaasListAnimate<HTMLDivElement>();
  const { isDesktop } = useSaasBreakpoint();

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter]
  );

  const activeAlerts = rows.length;
  const suspendedWithPayment = rows.filter((r) => r.type === "suspended_with_recent_paid").length;
  const ratio = rows.length > 0 ? `${Math.round((1000 * suspendedWithPayment) / rows.length) / 10}%` : "0%";

  const filterOptions: { value: "all" | PaymentHealthRow["type"]; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "active_without_paid_payment", label: "Activa sin pago" },
    { value: "suspended_with_recent_paid", label: "Suspendida con pago" },
  ];

  const handleRowClick = (row: PaymentHealthRow) => {
    if (isDesktop) return;
    setSelected(row);
  };

  return (
    <div className="min-w-0 space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <SaasMetricCard
          label="Alertas activas"
          value={`${activeAlerts}`}
          helper="Empresas con posible desalineación."
        />
        <SaasMetricCard
          label="Suspendidas con pago reciente"
          value={`${suspendedWithPayment}`}
          helper="Revisar reactivación manual."
        />
        <SaasMetricCard label="Ratio suspendidas/alertas" value={ratio} helper="Proporción del total de alertas." />
      </div>

      <Card className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80">
        <div ref={listRef} className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === option.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <SaasDataTable
        data={filtered}
        rowKey={(r) => `${r.type}-${r.company_id}`}
        emptyMessage="No se detectaron alertas con los criterios actuales."
        columns={[
          {
            key: "type",
            header: "Tipo",
            render: (r) => {
              const badge = healthAlertType(r.type);
              return <SaasStatusBadge label={badge.label} variant={badge.variant} />;
            },
          },
          {
            key: "company",
            header: "Empresa",
            render: (r) => <span className="font-medium">{r.company_name}</span>,
          },
          { key: "status", header: "Estado suscripción", render: (r) => r.subscription_status ?? "—" },
          { key: "payment", header: "Último pago", render: (r) => r.last_payment_status ?? "—" },
          {
            key: "date",
            header: "Fecha",
            render: (r) =>
              r.last_payment_date ? new Date(r.last_payment_date).toLocaleDateString("es-CL") : "—",
          },
          {
            key: "action",
            header: "",
            render: (r) =>
              isDesktop ? (
                <Link
                  href={`/companies/${r.company_id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  Ver empresa
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRowClick(r)}
                  className="font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Detalle
                </button>
              ),
          },
        ]}
      />

      <Drawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        direction="right"
        title={selected?.company_name}
        description="Detalle de alerta de pago"
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Estado:</span>{" "}
              {selected.subscription_status ?? "—"}
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Último pago:</span>{" "}
              {selected.last_payment_status ?? "—"}
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Fecha:</span>{" "}
              {selected.last_payment_date
                ? new Date(selected.last_payment_date).toLocaleDateString("es-CL")
                : "—"}
            </p>
            <Link
              href={`/companies/${selected.company_id}`}
              className="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Ver empresa
            </Link>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
