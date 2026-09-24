"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from "lucide-react";

type FinalizeState = "loading" | "paid" | "pending" | "error";

type FinalizeResponse = {
  status?: "paid" | "pending" | "not_found";
  ownerReady?: boolean;
  welcomeSent?: boolean;
  error?: string;
};

const MAX_PENDING_RETRIES = 5;
const RETRY_DELAY_MS = 4000;

/**
 * Confirma el estado del pago al volver del checkout. Solo consulta: el cobro y el alta
 * ya los hizo la captura de PayPal (o los hará el equipo al validar una transferencia).
 * Si PayPal aún no confirma, reintenta unas pocas veces antes de pedir que recargue.
 */
export function CheckoutSuccessFinalize({
  refParam,
  captureError,
}: {
  refParam: string | undefined;
  captureError?: string;
}) {
  const [state, setState] = useState<FinalizeState>(captureError ? "error" : "loading");
  const [result, setResult] = useState<FinalizeResponse>({});
  const [message, setMessage] = useState<string | null>(captureError ?? null);

  useEffect(() => {
    if (!refParam || captureError) return;

    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      attempt += 1;
      try {
        const response = await fetch(`/api/onboarding/finalize?ref=${encodeURIComponent(refParam)}`, { method: "POST" });
        const payload = (await response.json().catch(() => ({}))) as FinalizeResponse;
        if (cancelled) return;
        if (!response.ok) throw new Error(payload.error || "No pudimos confirmar el pago.");
        setResult(payload);
        if (payload.status === "paid") {
          setState("paid");
          return;
        }
        if (attempt < MAX_PENDING_RETRIES) {
          timer = setTimeout(check, RETRY_DELAY_MS);
        } else {
          setState("pending");
        }
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "No pudimos confirmar el pago.");
      }
    };

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refParam, captureError]);

  if (!refParam) return null;

  const tone =
    state === "paid"
      ? { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "text-emerald-600" }
      : state === "loading"
        ? { box: "border-sky-200 bg-sky-50 text-sky-900", icon: "text-sky-600" }
        : { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "text-amber-600" };

  const title =
    state === "loading"
      ? "Confirmando tu pago…"
      : state === "paid"
        ? "Pago confirmado"
        : state === "pending"
          ? "Tu pago aún no se confirma"
          : "No pudimos confirmar el pago";

  const detail =
    state === "loading"
      ? "Esto toma unos segundos."
      : state === "paid"
        ? result.ownerReady === false
          ? "Estamos preparando tu acceso. Te escribiremos por correo en cuanto esté listo."
          : "Te enviamos un correo para crear tu contraseña y entrar a tu cuenta. Revisa también spam."
        : state === "pending"
          ? "Si ya pagaste, espera un minuto y recarga esta página. Si el problema sigue, escríbenos."
          : message;

  const Icon = state === "loading" ? Loader2 : state === "paid" ? (result.ownerReady === false ? CheckCircle2 : MailCheck) : AlertCircle;

  return (
    <div>
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${tone.box}`} role="status" aria-live="polite">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon} ${state === "loading" ? "animate-spin" : ""}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {detail ? <p className="mt-0.5 text-sm opacity-90">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}
