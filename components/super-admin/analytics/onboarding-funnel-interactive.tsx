"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Copy, Mail, ExternalLink, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";

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
  onboarding_visit: { label: "Visita de Onboarding", desc: "Visitas a la página inicial /onboarding" },
  pending_verification: { label: "Registro Iniciado", desc: "Creó cuenta, esperando verificar correo" },
  email_verified: { label: "Correo Verificado", desc: "Verificó correo, esperando datos del negocio" },
  form_completed: { label: "Formulario Completo", desc: "Completó datos del negocio, esperando pago" },
  payment_pending: { label: "Pago Pendiente", desc: "En pasarela de pago o esperando transferencia" },
  active: { label: "Activo / Completado", desc: "Onboarding finalizado con éxito" },
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
  onboardingViews,
  onboardingVisitors,
  recentApplications,
  period
}: Props) {
  const [viewMode, setViewMode] = useState<"cumulative" | "snapshot">("cumulative");
  const [selectedStage, setSelectedStage] = useState<typeof STAGES[number] | "rejected" | "other" | null>("payment_pending");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Calculate cumulative funnel steps
  const funnelSteps = useMemo(() => {
    const active = counts.active ?? 0;
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
      { key: "onboarding_visit", label: "Visita de Onboarding", value: onboardingVisitors, pct: Math.round((onboardingVisitors / totalCount) * 100) },
      { key: "pending_verification", label: "Pendiente Verificación", value: counts.pending_verification ?? 0, pct: Math.round(((counts.pending_verification ?? 0) / totalCount) * 100) },
      { key: "email_verified", label: "Email Verificado", value: counts.email_verified ?? 0, pct: Math.round(((counts.email_verified ?? 0) / totalCount) * 100) },
      { key: "form_completed", label: "Formulario Listo", value: counts.form_completed ?? 0, pct: Math.round(((counts.form_completed ?? 0) / totalCount) * 100) },
      { key: "payment_pending", label: "Pago Pendiente", value: counts.payment_pending ?? 0, pct: Math.round(((counts.payment_pending ?? 0) / totalCount) * 100) },
      { key: "active", label: "Activos / Completados", value: counts.active ?? 0, pct: Math.round(((counts.active ?? 0) / totalCount) * 100) },
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

    for (let i = 1; i < funnelSteps.length - 1; i++) {
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
        subject = "Verifica tu cuenta en GodCode";
        body = `Hola ${name},\n\nNotamos que iniciaste tu registro para ${biz} en GodCode, pero aún no has verificado tu correo electrónico.\n\nPor favor, revisa tu bandeja de entrada (e incluso la carpeta de spam) para encontrar tu código de verificación de 6 dígitos.\n\nSi tienes algún problema, responde directamente a este correo.\n\nSaludos,\nEl equipo de GodCode`;
        break;
      case "email_verified":
        subject = "Completa la configuración de tu negocio en GodCode";
        body = `Hola ${name},\n\n¡Felicidades por verificar tu cuenta de GodCode!\n\nEl siguiente paso es completar los detalles de tu negocio (nombre, dirección y logo) en el panel de onboarding para que podamos crear tu menú digital.\n\nSolo te tomará 2 minutos completar este paso.\n\nSaludos,\nEl equipo de GodCode`;
        break;
      case "form_completed":
        subject = "Activa tu menú digital en GodCode";
        body = `Hola ${name},\n\nYa configuraste la información de ${biz}. ¡Excelente trabajo!\n\nSolo queda activar tu suscripción en la pasarela de pagos para publicar tu menú y empezar a recibir pedidos directo a tu WhatsApp y cocina.\n\nSi tienes dudas sobre los métodos de pago, háznoslo saber respondiendo aquí.\n\nSaludos,\nEl equipo de GodCode`;
        break;
      case "payment_pending":
        subject = "Pendiente activación de suscripción - GodCode";
        body = `Hola ${name},\n\nTu menú digital de ${biz} está listo para ser publicado.\n\nActualmente estamos esperando la confirmación de tu pago. Si realizaste una transferencia bancaria, por favor envíanos el comprobante por este medio o súbelo en la plataforma para activar tu tienda de inmediato.\n\n¡Estamos listos para ayudarte a vender!\n\nSaludos,\nEl equipo de GodCode`;
        break;
      default:
        subject = "Soporte de registro - GodCode";
        body = `Hola ${name},\n\nTe escribimos del soporte de GodCode. Vimos que estás en el proceso de onboarding para ${biz}.\n\n¿Tienes alguna duda o hay algo en lo que podamos ayudarte para completar tu activación?\n\nSaludos,\nEl equipo de GodCode`;
    }

    return `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Automated Insight Box */}
      {bottleneck && bottleneck.dropoff > 20 && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Alerta de Conversión: Fuga de Leads detectada
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              El paso con mayor tasa de abandono en este periodo es **{bottleneck.label}** con una pérdida del{" "}
              <span className="font-bold">{bottleneck.dropoff}%</span> de los usuarios que llegaron a la etapa anterior.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>
                {bottleneck.key === "payment_pending"
                  ? "Sugerencia: Envía un recordatorio de transferencia o valida si los métodos de pago están funcionando correctamente."
                  : bottleneck.key === "form_completed"
                  ? "Sugerencia: Simplifica el formulario de negocio o añade explicaciones claras sobre el formato de los campos."
                  : "Sugerencia: Revisa la entregabilidad de los correos de verificación (SPF/DKIM/DMARC)."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Funnel Visualizer */}
      <div className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Visualización de Conversión</h3>
            <p className="text-xs text-zinc-500">Analiza el comportamiento paso a paso del flujo de onboarding.</p>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {funnelSteps.map((step, idx) => {
              const isSelected = selectedStage === step.key;
              const isLast = idx === funnelSteps.length - 1;
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
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold dark:text-zinc-500">
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
        ) : (
          <div className="space-y-3">
            {snapshotSteps.map((step) => {
              const isSelected = selectedStage === step.key;
              return (
                <button
                  key={step.key}
                  onClick={() => setSelectedStage(step.key as any)}
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
      </div>

      {/* 3. stuck applications table */}
      <div className="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 overflow-hidden">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700 flex flex-wrap justify-between items-center gap-3 bg-zinc-50/30 dark:bg-zinc-900/30">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Solicitudes en estado: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedStage ? (FUNNEL_LABELS[selectedStage]?.label || selectedStage) : "Ninguno seleccionado"}</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Muestra los leads que están inactivos actualmente en esta etapa para contactarles.
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
              Estas visitas corresponden a usuarios que accedieron a la landing de onboarding pero aún no han ingresado su correo (Paso 1). No hay registros de contacto individuales.
            </p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            <CheckCircle className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">¡No hay leads estancados en esta etapa!</p>
            <p className="text-xs text-zinc-400 mt-1">
              Todos los usuarios de este periodo han avanzado o no hay solicitudes registradas con este estado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[10px] font-bold dark:bg-zinc-800/60 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Fecha Inicio</th>
                  <th className="px-4 py-3">Días Inactivo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredApps.map((app) => {
                  const created = new Date(app.created_at);
                  const diffDays = Math.max(0, Math.floor((Date.now() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)));
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
                            href={`/onboarding/solicitudes?search=${encodeURIComponent(app.email || "")}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 transition"
                            title="Abrir en listado operativo"
                            target="_blank"
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
      </div>
    </div>
  );
}
