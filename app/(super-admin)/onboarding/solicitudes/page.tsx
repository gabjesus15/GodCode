"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileBadge2,
  Filter,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SaasMetricCard } from "@/components/super-admin/shared/saas-metric-card";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasFilterBar, SaasSearchInput } from "@/components/super-admin/shared/saas-filter-bar";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { OnboardingSolicitudDetail } from "@/components/super-admin/onboarding/onboarding-solicitud-detail";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";
import { useSaasBreakpoint } from "@/components/super-admin/shared/use-saas-breakpoint";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { paymentStatus } from "@/lib/super-admin/status-maps";

interface SolicitudRow {
  id: string;
  business_name: string | null;
  responsible_name: string | null;
  email: string | null;
  sector: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  company_id: string | null;
  country: string | null;
  currency: string | null;
  plan_id: string | null;
  custom_plan_name: string | null;
  custom_plan_price: string | null;
  custom_domain: string | null;
  custom_domain_value: string | null;
  legal_name: string | null;
  fiscal_address: string | null;
  subscription_payment_method: string | null;
  plan_label: string;
  plan_price: number | null;
  payment_status: string | null;
  last_payment: {
    status: string;
    amount_paid: number;
    payment_date: string;
    payment_reference: string | null;
    reference_file_url: string | null;
  } | null;
  delivery_booking: {
    scheduled_for: string | null;
    assigned_to: string | null;
    assigned_admin_id: string | null;
    status: string;
  } | null;
  can_delete?: boolean;
  delete_block_reason?: string | null;
}

type StatusFilter =
  | "all"
  | "pending"
  | "payment_pending"
  | "with_proof"
  | "with_booking"
  | "delivery_today"
  | "delivery_tomorrow"
  | "rejected"
  | "active";

const PENDING_STATUSES = [
  "pending_verification",
  "email_verified",
  "form_completed",
  "payment_pending",
];

export default function OnboardingSolicitudesPage() {
  const [apps, setApps] = useState<SolicitudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [listRef] = useSaasListAnimate<HTMLDivElement>();
  const [chipsRef] = useSaasListAnimate<HTMLDivElement>();
  const { isDesktop } = useSaasBreakpoint();
  const [paymentConfirm, setPaymentConfirm] = useState<{
    reference: string;
    action: "validate" | "reject";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isSameLocalDay = (value: string | null, reference: Date): boolean => {
    if (!value) return false;
    const date = new Date(value);
    return (
      date.getFullYear() === reference.getFullYear() &&
      date.getMonth() === reference.getMonth() &&
      date.getDate() === reference.getDate()
    );
  };

  const loadRequests = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/solicitudes", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json?.error ??
          (res.status === 401 ? "No autorizado" : res.status === 403 ? "Sin permisos" : "Error al cargar");
        throw new Error(msg);
      }
      setApps(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient("super-admin");
    const channel = supabase
      .channel("super-admin-solicitudes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "onboarding_applications" },
        () => {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => {
            void loadRequests({ silent: true });
          }, 250);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments_history" },
        () => {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => {
            void loadRequests({ silent: true });
          }, 250);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const summary = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((row) => PENDING_STATUSES.includes(row.status ?? "")).length;
    const withProof = apps.filter((row) => Boolean(row.last_payment?.reference_file_url)).length;
    const withBooking = apps.filter((row) => Boolean(row.delivery_booking?.scheduled_for)).length;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deliveryToday = apps.filter((row) =>
      isSameLocalDay(row.delivery_booking?.scheduled_for ?? null, now)
    ).length;
    const deliveryTomorrow = apps.filter((row) =>
      isSameLocalDay(row.delivery_booking?.scheduled_for ?? null, tomorrow)
    ).length;
    const paymentPending = apps.filter((row) => row.payment_status === "pending_validation").length;
    const rejected = apps.filter(
      (row) => row.status === "rejected" || row.payment_status === "rejected"
    ).length;
    return { total, pending, withProof, withBooking, deliveryToday, deliveryTomorrow, paymentPending, rejected };
  }, [apps]);

  const filteredApps = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return apps.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.business_name,
          row.responsible_name,
          row.email,
          row.plan_label,
          row.subscription_payment_method,
          row.custom_domain_value,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesFilter =
        statusFilter === "all"
          ? true
          : statusFilter === "pending"
            ? PENDING_STATUSES.includes(row.status ?? "")
            : statusFilter === "payment_pending"
              ? row.status === "payment_pending"
              : statusFilter === "with_proof"
                ? Boolean(row.last_payment?.reference_file_url)
                : statusFilter === "with_booking"
                  ? Boolean(row.delivery_booking?.scheduled_for)
                  : statusFilter === "delivery_today"
                    ? isSameLocalDay(row.delivery_booking?.scheduled_for ?? null, now)
                    : statusFilter === "delivery_tomorrow"
                      ? isSameLocalDay(row.delivery_booking?.scheduled_for ?? null, tomorrow)
                      : statusFilter === "rejected"
                        ? row.status === "rejected" || row.payment_status === "rejected"
                        : row.status === "active";

      return matchesSearch && matchesFilter;
    });
  }, [apps, query, statusFilter]);

  const selectedApp = useMemo(() => {
    if (!filteredApps.length) return null;
    return filteredApps.find((row) => row.id === selectedId) ?? filteredApps[0] ?? null;
  }, [filteredApps, selectedId]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedApp) return;
    if (!selectedApp.can_delete) {
      setError(selectedApp.delete_block_reason ?? "Esta solicitud no puede eliminarse en su estado actual");
      return;
    }
    if (!confirm("¿Eliminar esta solicitud? Esta acción no se puede deshacer.")) return;

    const currentId = selectedApp.id;
    setActionKey(`delete:${currentId}`);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/solicitudes/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "No se pudo eliminar la solicitud");
      setApps((prev) => prev.filter((row) => row.id !== currentId));
      setSelectedId((prev) => (prev === currentId ? null : prev));
      await loadRequests({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la solicitud");
    } finally {
      setActionKey(null);
    }
  }, [loadRequests, selectedApp]);

  const handleValidatePayment = async (
    paymentReference: string | null,
    action: "validate" | "reject",
    reason?: string
  ) => {
    if (!paymentReference) return;
    const key = `${action}:${paymentReference}`;
    setActionKey(key);
    try {
      const endpoint = action === "validate" ? "/api/super-admin/payments/validate" : "/api/super-admin/payments/reject";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_reference: paymentReference, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "No se pudo procesar el pago");
      setPaymentConfirm(null);
      setRejectReason("");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo procesar el pago");
    } finally {
      setActionKey(null);
    }
  };

  const filterChips: Array<{
    id: StatusFilter;
    label: string;
    count: number;
    icon: React.ElementType;
  }> = [
    { id: "all", label: "Todas", count: summary.total, icon: Filter },
    { id: "pending", label: "Pendientes", count: summary.pending, icon: Clock3 },
    {
      id: "payment_pending",
      label: "Pago pendiente",
      count: apps.filter((row) => row.status === "payment_pending").length,
      icon: ShieldAlert,
    },
    { id: "with_proof", label: "Con comprobante", count: summary.withProof, icon: FileBadge2 },
    { id: "with_booking", label: "Con agenda", count: summary.withBooking, icon: Sparkles },
    { id: "delivery_today", label: "Entregas hoy", count: summary.deliveryToday, icon: Clock3 },
    { id: "delivery_tomorrow", label: "Entregas mañana", count: summary.deliveryTomorrow, icon: Clock3 },
    { id: "rejected", label: "Rechazadas", count: summary.rejected, icon: XCircle },
    {
      id: "active",
      label: "Activas",
      count: apps.filter((row) => row.status === "active").length,
      icon: CheckCircle2,
    },
  ];

  const formatDateTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
        Error al cargar solicitudes: {error}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <SaasPageHeader
        title="Solicitudes de onboarding"
        description="Revisa verificación de correo, comprobantes, pagos pendientes y rechazos."
      />

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Total", value: `${summary.total}`, helper: "Solicitudes cargadas" },
          { label: "Por revisar", value: `${summary.pending}`, helper: "Estados previos a cobro" },
          { label: "Pago pendiente", value: `${summary.paymentPending}`, helper: "Listas para validar" },
          { label: "Con comprobante", value: `${summary.withProof}`, helper: "Pago manual subido" },
          { label: "Con agenda", value: `${summary.withBooking}`, helper: "Entrega asignada" },
          { label: "Entregas hoy", value: `${summary.deliveryToday}`, helper: "Vence hoy" },
          { label: "Entregas mañana", value: `${summary.deliveryTomorrow}`, helper: "Vence mañana" },
          { label: "Rechazadas", value: `${summary.rejected}`, helper: "Revisión pendiente" },
        ].map((item) => (
          <SaasMetricCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
        ))}
      </div>

      {/* Filters */}
      <SaasFilterBar>
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SaasSearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por negocio, email, plan o método..."
            wrapperClassName="w-full lg:w-80"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        </div>

        <div ref={chipsRef} className="mt-3 flex flex-wrap gap-2">
          {filterChips.map((chip) => {
            const Icon = chip.icon;
            const active = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{chip.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-white/15 text-current dark:bg-zinc-900/10"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </SaasFilterBar>

      {/* List + detail */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="rounded-3xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Negocios</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {filteredApps.length} visibles de {apps.length}
              </p>
            </div>
            <Badge variant={summary.pending > 0 ? "warning" : "success"} className="gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {summary.pending > 0 ? "Requiere revisión" : "Sin pendientes"}
            </Badge>
          </div>

          <div ref={listRef} className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredApps.length === 0 ? (
              <div className="px-4 py-12">
                <SaasEmptyState
                  icon={Filter}
                  title="No hay solicitudes"
                  description="No hay solicitudes que coincidan con los filtros actuales."
                />
              </div>
            ) : (
              filteredApps.map((row) => {
                const isPendingReview = PENDING_STATUSES.includes(row.status ?? "");
                const isSelected = selectedApp?.id === row.id;
                const paymentBadge = paymentStatus(row.payment_status);

                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full px-4 py-4 text-left transition sm:px-5 ${
                      isSelected
                        ? "bg-zinc-50 dark:bg-zinc-800/60"
                        : "hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {row.business_name ?? "—"}
                          </span>
                          {isPendingReview && (
                            <SaasStatusBadge label="Prioridad" variant="warning" />
                          )}
                          {row.payment_status && (
                            <SaasStatusBadge label={paymentBadge.label} variant={paymentBadge.variant} />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {row.responsible_name ?? "—"} · {row.email ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 lg:justify-end">
                        <span className="rounded-full border border-zinc-100 bg-zinc-50 px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-900">
                          {row.plan_label}
                        </span>
                        {row.subscription_payment_method && (
                          <span className="rounded-full border border-zinc-100 bg-zinc-50 px-2.5 py-1 capitalize dark:border-zinc-800 dark:bg-zinc-900">
                            {String(row.subscription_payment_method).replace(/_/g, " ")}
                          </span>
                        )}
                        {row.last_payment?.reference_file_url && (
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                            Con comprobante
                          </span>
                        )}
                        {row.delivery_booking?.scheduled_for && (
                          <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
                            Entrega: {formatDateTime(row.delivery_booking.scheduled_for)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop detail */}
        {isDesktop && (
          <aside className="xl:sticky xl:top-6 xl:h-fit">
            {selectedApp ? (
              <OnboardingSolicitudDetail
                app={selectedApp}
                actionKey={actionKey}
                onClose={() => setSelectedId(null)}
                onDelete={handleDeleteSelected}
                onValidatePayment={(reference, action) => setPaymentConfirm({ reference, action })}
              />
            ) : (
              <SaasEmptyState
                icon={Filter}
                title="Selecciona una solicitud"
                description="Haz click en un negocio para ver toda la información y actuar desde aquí."
              />
            )}
          </aside>
        )}
      </div>

      {/* Mobile drawer detail */}
      <Drawer
        open={!isDesktop && !!selectedApp}
        onOpenChange={(open) => !open && setSelectedId(null)}
        direction="right"
        title={selectedApp?.business_name ?? "Detalle"}
        description="Solicitud de onboarding"
        contentClassName="max-w-none"
      >
        {selectedApp && !isDesktop ? (
          <OnboardingSolicitudDetail
            app={selectedApp}
            actionKey={actionKey}
            onClose={() => setSelectedId(null)}
            onDelete={handleDeleteSelected}
            onValidatePayment={(reference, action) => setPaymentConfirm({ reference, action })}
          />
        ) : null}
      </Drawer>

      {/* Payment confirmation drawer */}
      <Drawer
        open={!!paymentConfirm}
        onOpenChange={(open) => !open && setPaymentConfirm(null)}
        title={paymentConfirm?.action === "validate" ? "Confirmar pago" : "Rechazar pago"}
        description="Confirma la acción sobre el comprobante."
        footer={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setPaymentConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              variant={paymentConfirm?.action === "reject" ? "destructive" : "default"}
              onClick={() =>
                void handleValidatePayment(
                  paymentConfirm?.reference ?? null,
                  paymentConfirm?.action ?? "validate",
                  paymentConfirm?.action === "reject" ? rejectReason.trim() || undefined : undefined
                )
              }
            >
              Confirmar
            </Button>
          </div>
        }
      >
        {paymentConfirm?.action === "reject" ? (
          <label className="block text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Motivo (opcional)</span>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ¿Validar este pago y activar la solicitud?
          </p>
        )}
      </Drawer>
    </div>
  );
}
