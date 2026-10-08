"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Lock, MailCheck, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/track-event";
import { forgetOnboardingToken, readOnboardingToken } from "@/lib/onboarding/onboarding-token-storage";
import { MIN_OWNER_PASSWORD_LENGTH } from "@/lib/onboarding/owner-password-rules";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type FinalizeState = "loading" | "paid" | "pending" | "error";

type FinalizeResponse = {
  status?: "paid" | "pending" | "not_found";
  ownerReady?: boolean;
  welcomeSent?: boolean;
  /** «Arma y paga»: la tienda que armó en vista previa ya quedó abierta. */
  fromDraft?: boolean;
  error?: string;
};

/** Donde lo espera la celebración con su QR (el asistente, ya con la tienda abierta). */
const DRAFT_OPENED_PATH = "/cuenta/configurar?paso=publicar&abierta=1";

/** Un pago confirmado se cuenta una sola vez aunque recarguen la página de éxito. */
function trackPaidOnce(ref: string, fromDraft: boolean) {
  const key = `gc_paid_${ref}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Sin sessionStorage se registra igual.
  }
  trackEvent("subscription_paid", fromDraft ? { flow: "draft" } : {});
}

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
  // Token de la solicitud guardado al pagar en esta pestaña: con él se crea la contraseña aquí.
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(readOnboardingToken());
  }, []);

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
          trackPaidOnce(refParam, Boolean(payload.fromDraft));
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

  // La tienda armada en vista previa ya está abierta: se va directo a compartirla.
  const draftOpened = state === "paid" && Boolean(result.fromDraft);
  useEffect(() => {
    if (!draftOpened) return;
    forgetOnboardingToken();
    const timer = setTimeout(() => window.location.assign(DRAFT_OPENED_PATH), 2500);
    return () => clearTimeout(timer);
  }, [draftOpened]);

  if (!refParam) return null;

  if (draftOpened) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">¡Tu tienda ya está abierta!</p>
            <p className="mt-0.5 text-sm opacity-90">Tus clientes ya pueden entrar con tu link y hacerte pedidos. Te llevamos a compartirla.</p>
          </div>
        </div>
        <a
          href={DRAFT_OPENED_PATH}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Ver mi tienda abierta
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    );
  }

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

  const canSetPasswordHere = state === "paid" && result.ownerReady !== false && Boolean(token);

  const detail =
    state === "loading"
      ? "Esto toma unos segundos."
      : state === "paid"
        ? result.ownerReady === false
          ? "Estamos preparando tu acceso. Te escribiremos por correo en cuanto esté listo."
          : canSetPasswordHere
            ? "Crea tu contraseña aquí y entra a tu cuenta ahora mismo. También te enviamos el enlace por correo."
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
      {canSetPasswordHere && token ? <FirstPasswordForm refParam={refParam} token={token} /> : null}
    </div>
  );
}

/** Crear la contraseña sin salir de la página de éxito y entrar directo a /cuenta. */
function FirstPasswordForm({ refParam, token }: { refParam: string; token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_OWNER_PASSWORD_LENGTH) {
      setError(`Usa al menos ${MIN_OWNER_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refParam, token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { email?: string; error?: string };
      if (!res.ok || !data.email) throw new Error(data.error || "No pudimos guardar la contraseña.");

      const supabase = createSupabaseBrowserClient("super-admin");
      await supabase.auth.signOut({ scope: "local" });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password });
      if (signInError) throw new Error("Tu contraseña quedó guardada. Entra desde el login con tu correo.");

      forgetOnboardingToken();
      trackEvent("first_login", { method: "checkout_success" });
      window.location.assign("/post-login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la contraseña.");
      setLoading(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-900 outline-none transition focus:border-[#4F5BFF] focus:ring-4 focus:ring-[#4F5BFF]/10";

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-slate-200 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Lock className="h-4 w-4 text-[#4F5BFF]" aria-hidden />
        Crea tu contraseña
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            minLength={MIN_OWNER_PASSWORD_LENGTH}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Repítela
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={inputClass}
            minLength={MIN_OWNER_PASSWORD_LENGTH}
            required
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="mt-4 h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800">
        Entrar a mi cuenta
      </Button>
    </form>
  );
}
