"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { onboardingStatus, paymentStatus } from "@/lib/super-admin/status-maps";

interface LastPayment {
  status: string;
  amount_paid: number;
  payment_date: string;
  payment_reference: string | null;
  reference_file_url: string | null;
}

interface DeliveryBooking {
  scheduled_for: string | null;
  assigned_to: string | null;
  assigned_admin_id: string | null;
  status: string;
}

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
  last_payment: LastPayment | null;
  delivery_booking: DeliveryBooking | null;
  can_delete?: boolean;
  delete_block_reason?: string | null;
}

interface OnboardingSolicitudDetailProps {
  app: SolicitudRow;
  actionKey: string | null;
  onClose: () => void;
  onDelete: () => void;
  onValidatePayment: (reference: string, action: "validate" | "reject") => void;
}

export function OnboardingSolicitudDetail({
  app,
  actionKey,
  onClose,
  onDelete,
  onValidatePayment,
}: OnboardingSolicitudDetailProps) {
  const statusBadge = onboardingStatus(app.status);
  const paymentBadge = paymentStatus(app.payment_status);
  const canReviewPayment =
    app.payment_status === "pending_validation" && Boolean(app.last_payment?.payment_reference);
  const paymentReference = app.last_payment?.payment_reference ?? "";

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

  const formatMethod = (method: string | null) =>
    method ? String(method).replace(/_/g, " ") : "—";

  return (
    <Card className="rounded-3xl border border-zinc-200/60 bg-white p-5 dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Detalle de solicitud
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {app.business_name ?? "Sin nombre"}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {app.responsible_name ?? "—"} · {app.email ?? "—"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Estado
          </span>
          <SaasStatusBadge label={statusBadge.label} variant={statusBadge.variant} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Pago
          </span>
          <SaasStatusBadge label={paymentBadge.label} variant={paymentBadge.variant} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Plan
          </span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{app.plan_label}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Fecha
          </span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {formatDateTime(app.created_at)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm text-zinc-700 dark:text-zinc-300">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Legal
          </span>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{app.legal_name ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Dirección fiscal
          </span>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{app.fiscal_address ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            País / moneda
          </span>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {app.country ?? "—"} · {app.currency ?? "—"}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Dominio
          </span>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {app.custom_domain_value ?? app.custom_domain ?? "—"}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Método de pago
          </span>
          <p className="mt-1 font-medium capitalize text-zinc-900 dark:text-zinc-100">
            {formatMethod(app.subscription_payment_method)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Pago / comprobante
        </p>
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Referencia: {app.last_payment?.payment_reference ?? "—"}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Monto: {app.last_payment ? `$${app.last_payment.amount_paid}` : "—"}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Fecha de pago: {app.last_payment ? formatDateTime(app.last_payment.payment_date) : "—"}
          </p>
          {app.last_payment?.reference_file_url && (
            <a
              href={app.last_payment.reference_file_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex w-fit items-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
            >
              Ver comprobante
            </a>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Booking de entrega
        </p>
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Fecha agendada: {app.delivery_booking?.scheduled_for ? formatDateTime(app.delivery_booking.scheduled_for) : "Sin agenda"}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Asignado a: {app.delivery_booking?.assigned_to ?? "Pendiente de asignar"}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Estado interno: {app.delivery_booking?.status ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {canReviewPayment && (
          <>
            <Button
              type="button"
              size="sm"
              disabled={actionKey === `validate:${paymentReference}` || !paymentReference}
              onClick={() => onValidatePayment(paymentReference, "validate")}
            >
              {actionKey === `validate:${paymentReference}` ? "Validando..." : "Aceptar pago"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={actionKey === `reject:${paymentReference}` || !paymentReference}
              onClick={() => onValidatePayment(paymentReference, "reject")}
            >
              {actionKey === `reject:${paymentReference}` ? "Rechazando..." : "Rechazar"}
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!app.can_delete || actionKey === `delete:${app.id}`}
          title={
            !app.can_delete
              ? app.delete_block_reason ?? "Esta solicitud no se puede eliminar"
              : undefined
          }
          onClick={() => void onDelete()}
        >
          {actionKey === `delete:${app.id}` ? "Eliminando..." : "Eliminar solicitud"}
        </Button>
        {!app.can_delete && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {app.delete_block_reason ?? "Esta solicitud no se puede eliminar"}
          </p>
        )}
      </div>
    </Card>
  );
}
