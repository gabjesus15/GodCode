"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type FinalizeState = "loading" | "success" | "error";

export function CheckoutSuccessFinalize({ refParam }: { refParam: string | undefined }) {
  const [state, setState] = useState<FinalizeState>("loading");
  const [message, setMessage] = useState<string | null>("Verificando y sincronizando tu pago...");

  useEffect(() => {
    if (!refParam) return;

    let cancelled = false;

    fetch(`/api/onboarding/finalize?ref=${encodeURIComponent(refParam)}`, {
      method: "POST",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo sincronizar el pago");
        }
        setState("success");
        setMessage(payload.message ?? "Pago sincronizado correctamente.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "No se pudo sincronizar el pago");
      });

    return () => {
      cancelled = true;
    };
  }, [refParam]);

  if (!refParam) return null;

  const toneClass =
    state === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : state === "error"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-sky-200 bg-sky-50 text-sky-800";
  const iconClass =
    state === "success"
      ? "text-emerald-600"
      : state === "error"
        ? "text-amber-600"
        : "text-sky-600";

  return (
    <div className="mx-auto mb-6 max-w-5xl px-6 pt-6">
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${toneClass}`}>
        {state === "loading" ? (
          <Loader2 className={`mt-0.5 h-5 w-5 animate-spin ${iconClass}`} />
        ) : state === "success" ? (
          <CheckCircle2 className={`mt-0.5 h-5 w-5 ${iconClass}`} />
        ) : (
          <AlertCircle className={`mt-0.5 h-5 w-5 ${iconClass}`} />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {state === "loading"
              ? "Sincronizando pago"
              : state === "success"
                ? "Pago sincronizado"
                : "No pudimos confirmar todo todavía"}
          </p>
          {message ? <p className="mt-0.5 text-sm opacity-90">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
