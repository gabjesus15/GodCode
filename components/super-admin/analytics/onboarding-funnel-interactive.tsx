"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Copy, Mail, ExternalLink, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";

type OnboardingApp = {
  id: string;
  business_name: string | null;
  responsible_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  counts: Record<string, number>;
  total: number;
  onboardingViews: number;
  onboardingVisitors: number;
  recentApplications: OnboardingApp[];
  period: string;
};

const FUNNEL_LABELS: Record<string, { label: string; desc: string }> = {
  onboarding_visit: { label: "Visitas al registro", desc: "Personas que abrieron /onboarding" },
  pending_verification: { label: "Registro iniciado", desc: "Dejó su correo; falta verificarlo" },
  email_verified: { label: "Correo verificado", desc: "Falta completar los datos del negocio" },
  form_completed: { label: "Formulario completo", desc: "Datos listos; falta pagar" },
  payment_pending: { label: "Pago pendiente", desc: "Eligió método; falta pagar o validar el pago" },
  active: { label: "Activas", desc: "Pagaron y la tienda quedó creada" },
};

/** Cómo leer el periodo del filtro (la página pasa "7", "30", "all"…). */
const PERIOD_LABELS: Record<string, string> = {
  "7": "Últimos 7 días",
  "30": "Últimos 30 días",
  "90": "Últimos 90 días",
  "365": "Últimos 12 meses",
  all: "Todo el historial",
};

/** Qué hacer según la etapa donde más se pierde gente. */
const BOTTLENECK_TIPS: Record<string, string> = {
  email_verified: "Revisa que lleguen los correos de verificación (SPF/DKIM/DMARC) y reenvía el código a quienes no verificaron.",
  form_completed: "Muchos verifican y no completan el formulario: acórtalo o explica mejor qué pide cada campo.",
  payment_pending: "Completan el formulario y no eligen cómo pagar: revisa precios y que los métodos del país estén activos.",
  active: "Hay pagos que no se completan: escribe a quienes quedaron en «Pago pendiente» y revisa «Pagos por validar».",
};

const STAGES = [
  "onboarding_visit",
  "pending_verification",
  "email_verified",
  "form_completed",
  "payment_pending",
  "active"
] as const;

export function OnboardingFunnelInteractive({
  counts,
  total,
  onboardingVisitors,
  recentApplications,
  period
}: Props) {
  const [viewMode, setViewMode] = useState<"cumulative" | "snapshot">("cumulative");
  const [selectedStage, setSelectedStage] = useState<typeof STAGES[number] | "rejected" | "other" | null>("payment_pending");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stuckListRef] = useSaasListAnimate<HTMLTableSectionElement>();
  const [nowTs] = useState(() => Date.now());

  // 1. Calculate cumulative funnel steps
  const funnelSteps = useMemo(() => {
    const active = (counts.active ?? 0) + (counts.payment_validated ?? 0);
    const payment_pending = counts.payment_pending ?? 0;
    const form_completed = counts.form_completed ?? 0;
    const email_verified = counts.email_verified ?? 0;
    const pending_verification = counts.pending_verification ?? 0;

    // Cumulative calculations
    const cActive = active;
    const cPayment = payment_pending + cActive;
    const cForm = form_completed + cPayment;
    const cEmail = email_verified + cForm;
    const cPending = pending_verification + cEmail; // Matches total applications
    const cVisit = Math.max(onboardingVisitors, cPending); // Visitas iniciales

    const cCounts: Record<string, number> = {
      onboarding_visit: cVisit,
      pending_verification: cPending,
      email_verified: cEmail,
      form_completed: cForm,
      payment_pending: cPayment,
      active: cActive,
    };

    return STAGES.map((key, index) => {
      const value = cCounts[key] || 0;
      const prevKey = index > 0 ? STAGES[index - 1] : null;
      const prevValue = prevKey ? cCounts[prevKey] || 0 : 0;

      // Conversion relative to previous step
      const stepConversion = prevValue > 0 ? Math.round((value / prevValue) * 1000) / 10 : 100;
      // Conversion relative to absolute start (Visits)
      const totalConversion = cVisit > 0 ? Math.round((value / cVisit) * 1000) / 10 : 0;
      // Dropoff from previous step
      const dropoff = prevValue > 0 ? Math.round(((prevValue - value) / prevValue) * 1000) / 10 : 0;

      return {
        key,
        label: FUNNEL_LABELS[key]?.label || key,
        desc: FUNNEL_LABELS[key]?.desc || "",
        value,
        stepConversion,
        totalConversion,
        dropoff,
      };
    });
  }, [counts, onboardingVisitors]);

  // 2. Snapshot views (current status count)
  const snapshotSteps = useMemo(() => {
    const totalCount = Math.max(1, total + onboardingVisitors);
    return [
      { key: "onboarding_visit", label: "Visitas al registro", value: onboardingVisitors, pct: Math.round((onboardingVisitors / totalCount) * 100) },
      { key: "pending_verification", label: "Correo sin verificar", value: counts.pending_verification ?? 0, pct: Math.round(((counts.pending_verification ?? 0) / totalCount) * 100) },
      { key: "email_verified", label: "Correo verificado", value: counts.email_verified ?? 0, pct: Math.round(((counts.email_verified ?? 0) / totalCount) * 100) },
      { key: "form_completed", label: "Formulario completo", value: counts.form_completed ?? 0, pct: Math.round(((counts.form_completed ?? 0) / totalCount) * 100) },
      { key: "payment_pending", label: "Pago pendiente", value: counts.payment_pending ?? 0, pct: Math.round(((counts.payment_pending ?? 0) / totalCount) * 100) },
      { key: "active", label: "Activas", value: (counts.active ?? 0) + (counts.payment_validated ?? 0), pct: Math.round((((counts.active ?? 0) + (counts.payment_validated ?? 0)) / totalCount) * 100) },
      { key: "rejected", label: "Rechazados", value: counts.rejected ?? 0, pct: Math.round(((counts.rejected ?? 0) / totalCount) * 100) },
      { key: "other", label: "Otros", value: counts.other ?? 0, pct: Math.round(((counts.other ?? 0) / totalCount) * 100) },
    ];
  }, [counts, total, onboardingVisitors]);

  // 3. Automated Insights
  const bottleneck = useMemo(() => {
    // Find the step in funnelSteps (excluding Visita -> Registro since that is landing bounce, and active)
    // with the highest dropoff rate
    let maxDropoff = -1;
    let worstStep: typeof funnelSteps[number] | null = null;

    for (let i = 2; i < funnelSteps.length; i++) {
      const step = funnelSteps[i];
      if (step.dropoff > maxDropoff) {
        maxDropoff = step.dropoff;
        worstStep = step;
      }
    }

    return worstStep;
  }, [funnelSteps]);

  // 4. Stuck applications list filtered by selection
  const filteredApps = useMemo(() => {
    if (!selectedStage || selectedStage === "onboarding_visit") return [];
    return recentApplications.filter((app) => app.status === selectedStage);
  }, [recentApplications, selectedStage]);

  // Copy helper
  const handleCopyEmail = (email: string, appId: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(appId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get custom reminder email template
  const getEmailTemplate = (app: OnboardingApp) => {
    const name = app.responsible_name || "Comerciante";
    const biz = app.business_name || "tu negocio";
    let subject = "";
    let body = "";

    switch (app.status) {
      case "pending_verification":
        subject = "Confirma tu correo para seguir con tu alta en Gcode POS";
        body = `Hola ${name},\n\nVimos que empezaste el alta de ${biz} en Gcode POS, pero todavía no confirmaste tu correo.\n\nBusca en tu bandeja (y en spam) el correo «Confirma tu correo» y pulsa el botón. Si el enlace venció, vuelve a registrarte con el mismo correo y te mandamos uno nuevo.\n\nSi tienes algún problema, responde a este correo.\n\nSaludos,\nEl equipo de Gcode`;
        break;
      case "email_verified":
        subject = "Elige tu plan para terminar el alta en Gcode POS";
        body = `Hola ${name},\n\nYa confirmaste tu correo. El siguiente paso es elegir el plan de ${biz} y el método de pago, desde el enlace del correo de confirmación.\n\nToma menos de 2 minutos. Si tienes dudas sobre qué plan te conviene, responde este correo y te ayudamos.\n\nSaludos,\nEl equipo de Gcode`;
        break;
      case "form_completed":
        subject = `Solo falta el pago para activar ${biz} en Gcode POS`;
        body = `Hola ${name},\n\nYa elegiste el plan de ${biz}. Solo falta el pago para activar tu cuenta y publicar tu menú.\n\nPuedes pagar con PayPal o por transferencia (subiendo el comprobante). Si tienes dudas sobre los métodos de pago, responde este correo.\n\nSaludos,\nEl equipo de Gcode`;
        break;
      case "payment_pending":
        subject = "Estamos esperando tu pago - Gcode POS";
        body = `Hola ${name},\n\nEl alta de ${biz} está lista: solo falta confirmar el pago.\n\nSi pagaste por transferencia, sube el comprobante desde el enlace del alta o respóndenos este correo con él, y activamos tu cuenta apenas lo validemos.\n\nSaludos,\nEl equipo de Gcode`;
        break;
      default:
        subject = `¿Te ayudamos con el alta de ${biz}? - Gcode POS`;
        body = `Hola ${name},\n\nTe escribimos del equipo de Gcode. Vimos que estás en el alta de ${biz}.\n\n¿Tienes alguna duda o hay algo en lo que podamos ayudarte para terminarla?\n\nSaludos,\nEl equipo de Gcode`;
    }

    return `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-none rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Embudo de altas</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {PERIOD_LABELS[period] ?? `Periodo: ${period}`} · conversión por etapa y quién quedó a medio camino.
        </p>
      </Card>
      {/* 1. Automated Insight Box */}
      {bottleneck && bottleneck.dropoff > 20 && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Aquí se pierde más gente
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              La etapa con más abandono es <strong>{bottleneck.label}</strong>: no llega el{" "}
              <span className="font-bold">{bottleneck.dropoff}%</span> de quienes estaban en la etapa anterior.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>{BOTTLENECK_TIPS[bottleneck.key] ?? "Revisa esa etapa del registro y escribe a quienes quedaron ahí."}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Funnel Visualizer */}
      <Card className="shadow-none rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Visualización de Conversión</h3>
            <p className="text-xs text-zinc-500">Cuántas personas avanzan en cada paso del registro.</p>
          </div>
          <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
            <button
              onClick={() => setViewMode("cumulative")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                viewMode === "cumulative"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-700 dark:text-indigo-400"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Flujo de Embudo
            </button>
            <button
              onClick={() => setViewMode("snapshot")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                viewMode === "snapshot"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-700 dark:text-indigo-400"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Distribución Actual (Snapshot)
            </button>
          </div>
        </div>

        {viewMode === "cumulative" ? (
          <>
            <div className="mb-6">
              <div className="flex h-48 gap-2 sm:gap-4">
                {funnelSteps.map((step) => {
                  const maxValue = Math.max(...funnelSteps.map((s) => s.value), 1);
                  const heightPct = Math.max((step.value / maxValue) * 100, 4);
                  return (
                    <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      {/* La columna ocupa el alto del gráfico; sin eso el % de la barra se resolvía a 0 y no se veía. */}
                      <div className="flex w-full flex-1 items-end pt-5">
                        <div
                          className="relative w-full rounded-t-lg bg-indigo-500 transition-all dark:bg-indigo-400"
                          style={{ height: `${heightPct}%` }}
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                            {step.value}
                          </span>
                        </div>
                      </div>
                      <span className="text-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {funnelSteps.map((step, idx) => {
              const isSelected = selectedStage === step.key;
              return (
                <button
                  key={step.key}
                  onClick={() => setSelectedStage(step.key)}
                  className={`flex flex-col items-stretch text-left rounded-xl border p-3.5 transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/40 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/20"
                      : "border-zinc-200 bg-white/50 hover:bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    Paso {idx}
                  </p>
                  <h4 className="mt-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {step.label}
                  </h4>
                  <p className="mt-2 text-xl font-extrabold tabular-nums">
                    {step.value}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {idx === 0 ? "Visitas base" : `${step.totalConversion}% del total`}
                  </p>

                  {/* Progressive conversion metric */}
                  {idx > 0 && (
                    <div className="mt-4 border-t border-dashed border-zinc-200 pt-2 dark:border-zinc-700">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {step.stepConversion}% conv.
                        </span>
                        <span className="text-red-500 dark:text-red-400">
                          -{step.dropoff}% fugas
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          </>
        ) : (
          <div className="space-y-3">
            {snapshotSteps.map((step) => {
              const isSelected = selectedStage === step.key;
              return (
                <button
                  key={step.key}
                  onClick={() => setSelectedStage(step.key as typeof STAGES[number] | "rejected" | "other")}
                  className={`w-full block text-left rounded-xl border p-3 transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/40 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/20"
                      : "border-zinc-200 bg-white/50 hover:bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {FUNNEL_LABELS[step.key]?.label || step.label} (estado actual)
                    </span>
                    <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                      {step.value} ({step.pct}% del total)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${step.pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* 3. stuck applications table */}
      <Card className="shadow-none overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700 flex flex-wrap justify-between items-center gap-3 bg-zinc-50/30 dark:bg-zinc-900/30">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Solicitudes en estado: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedStage ? (FUNNEL_LABELS[selectedStage]?.label || selectedStage) : "Ninguno seleccionado"}</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Quienes siguen en esta etapa, para escribirles.
            </p>
          </div>
          <div className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold tabular-nums dark:bg-zinc-800">
            Total en lista: {filteredApps.length}
          </div>
        </div>

        {selectedStage === "onboarding_visit" ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            <CheckCircle className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Las visitas iniciales son anónimas</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Son personas que abrieron el registro sin dejar su correo: no hay datos de contacto.
            </p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            <CheckCircle className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Nadie quedó en esta etapa.</p>
            <p className="text-xs text-zinc-400 mt-1">
              Todos los usuarios de este periodo han avanzado o no hay solicitudes registradas con este estado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="border-b border-zinc-100 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Negocio</th>
                  <th scope="col" className="px-4 py-3 font-medium">Responsable</th>
                  <th scope="col" className="px-4 py-3 font-medium">Correo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Fecha de inicio</th>
                  <th scope="col" className="px-4 py-3 font-medium">Días inactivo</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody ref={stuckListRef} className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredApps.map((app) => {
                  const created = new Date(app.created_at);
                  const diffDays = Math.max(0, Math.floor((nowTs - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)));
                  const bizName = app.business_name?.trim() || "(Sin nombre aún)";
                  return (
                    <tr key={app.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{bizName}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{app.responsible_name || "—"}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">{app.email}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-500">
                        {created.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        <span className={diffDays > 5 ? "text-red-500" : diffDays > 2 ? "text-amber-500" : "text-zinc-500"}>
                          {diffDays === 0 ? "Hoy" : `${diffDays} día${diffDays > 1 ? "s" : ""}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {app.email && (
                            <>
                              <button
                                onClick={() => handleCopyEmail(app.email!, app.id)}
                                className="inline-flex h-7 px-2 items-center gap-1 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 font-medium transition"
                                title="Copiar correo"
                              >
                                <Copy className="h-3 w-3" />
                                <span>{copiedId === app.id ? "Copiado" : "Copiar"}</span>
                              </button>
                              <a
                                href={getEmailTemplate(app)}
                                className="inline-flex h-7 px-2 items-center gap-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40 font-medium transition"
                                title="Enviar plantilla de recordatorio"
                              >
                                <Mail className="h-3 w-3" />
                                <span>Recordatorio</span>
                              </a>
                            </>
                          )}
                          <Link
                            href={`/dashboard/solicitud/${app.id}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 transition"
                            title="Revisar solicitud"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
