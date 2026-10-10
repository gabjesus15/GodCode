"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Lock, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/track-event";
import { forgetOnboardingToken, readOnboardingToken } from "@/lib/onboarding/onboarding-token-storage";
import { MAX_OWNER_PASSWORD_LENGTH, MIN_OWNER_PASSWORD_LENGTH } from "@/lib/onboarding/owner-password-rules";
import { isSpentPasswordLinkCode, resolveSetPasswordErrorCode, type CheckoutFinalizeCopy } from "@/lib/plans/checkout-copy";
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

/**
 * Cómo quedó «Crea tu contraseña»: el formulario sigue, el enlace ya no sirve (se usó o
 * venció) o la contraseña se guardó pero la sesión no se pudo abrir aquí.
 */
type PasswordStage = "form" | "spent" | "saved";

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
 * Los textos llegan de la página (`getCheckoutCopy`), en el idioma del visitante.
 */
export function CheckoutSuccessFinalize({
  refParam,
  captureError,
  copy,
}: {
  refParam: string | undefined;
  captureError?: string;
  copy: CheckoutFinalizeCopy;
}) {
  const [state, setState] = useState<FinalizeState>(captureError ? "error" : "loading");
  const [result, setResult] = useState<FinalizeResponse>({});
  const [message, setMessage] = useState<string | null>(captureError ?? null);
  // Token de la solicitud guardado al pagar en esta pestaña: con él se crea la contraseña aquí.
  const [token, setToken] = useState<string | null>(null);
  const [passwordStage, setPasswordStage] = useState<PasswordStage>("form");

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
        // Los errores del servicio son genéricos y en español («Error interno»): al visitante se
        // le dice qué hacer, en su idioma. El de la captura (que llega en la URL) sí se muestra.
        if (!response.ok) throw new Error(copy.errorText);
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
        setMessage(error instanceof Error && error.message ? error.message : copy.errorText);
      }
    };

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refParam, captureError, copy.errorText]);

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
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{copy.draftTitle}</p>
            <p className="mt-0.5 text-sm opacity-90">{copy.draftText}</p>
          </div>
        </div>
        <a
          href={DRAFT_OPENED_PATH}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {copy.draftButton}
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
      ? copy.loadingTitle
      : state === "paid"
        ? copy.paidTitle
        : state === "pending"
          ? copy.pendingTitle
          : copy.errorTitle;

  const canSetPasswordHere = state === "paid" && result.ownerReady !== false && Boolean(token) && passwordStage === "form";

  const detail =
    state === "loading"
      ? copy.loadingText
      : state === "paid"
        ? result.ownerReady === false
          ? copy.ownerPendingText
          : passwordStage === "spent"
            ? copy.linkSpentText
            : passwordStage === "saved"
              ? copy.passwordSavedSignIn
              : canSetPasswordHere
                ? copy.setPasswordHereText
                : copy.checkEmailText
        : state === "pending"
          ? copy.pendingText
          : message;

  // El enlace ya no sirve: se crea una contraseña nueva desde la recuperación. Guardada sin
  // sesión: se entra desde el login.
  const action =
    state !== "paid" || result.ownerReady === false
      ? null
      : passwordStage === "spent"
        ? { href: "/login/recuperar", label: copy.linkSpentButton }
        : passwordStage === "saved"
          ? { href: "/login", label: copy.loginButton }
          : null;

  const Icon = state === "loading" ? Loader2 : state === "paid" ? (result.ownerReady === false ? CheckCircle2 : MailCheck) : AlertCircle;

  return (
    <div>
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${tone.box}`} role="status" aria-live="polite">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon} ${state === "loading" ? "animate-spin" : ""}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {detail ? <p className="mt-0.5 text-sm opacity-90">{detail}</p> : null}
          {action ? (
            <a
              href={action.href}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {action.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
      {canSetPasswordHere && token ? (
        <FirstPasswordForm
          refParam={refParam}
          token={token}
          copy={copy}
          onSpent={() => setPasswordStage("spent")}
          onSavedWithoutSession={() => setPasswordStage("saved")}
        />
      ) : null}
    </div>
  );
}

type SetPasswordResponse = { ok?: boolean; email?: string; code?: string; error?: string };

/** `null` si no hubo respuesta (sin red): no se sabe si se guardó, así que se puede reintentar. */
async function postFirstPassword(body: { ref: string; token: string; password: string }) {
  try {
    const res = await fetch("/api/onboarding/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as SetPasswordResponse;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return null;
  }
}

/** Crear la contraseña sin salir de la página de éxito y entrar directo a /cuenta. */
function FirstPasswordForm({
  refParam,
  token,
  copy,
  onSpent,
  onSavedWithoutSession,
}: {
  refParam: string;
  token: string;
  copy: CheckoutFinalizeCopy;
  onSpent: () => void;
  onSavedWithoutSession: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_OWNER_PASSWORD_LENGTH) {
      setError(copy.passwordTooShort.replace("{n}", String(MIN_OWNER_PASSWORD_LENGTH)));
      return;
    }
    if (password !== confirm) {
      setError(copy.passwordMismatch);
      return;
    }
    setLoading(true);

    const response = await postFirstPassword({ ref: refParam, token, password });
    if (!response) {
      setError(copy.passwordErrors.server_error);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      const code = resolveSetPasswordErrorCode(response.data.code, response.status);
      if (isSpentPasswordLinkCode(code)) {
        // Ese token ya no sirve (se usó, venció o no corresponde): reintentar no tiene salida.
        forgetOnboardingToken();
        onSpent();
        return;
      }
      setError(
        copy.passwordErrors[code]
          .replace("{min}", String(MIN_OWNER_PASSWORD_LENGTH))
          .replace("{max}", String(MAX_OWNER_PASSWORD_LENGTH)),
      );
      setLoading(false);
      return;
    }

    // La contraseña quedó guardada y el token se gastó (es de un solo uso): se olvida ya,
    // aunque abrir la sesión falle después.
    forgetOnboardingToken();
    try {
      const email = response.data.email;
      if (!email) throw new Error("set-password sin correo");
      const supabase = createSupabaseBrowserClient("super-admin");
      await supabase.auth.signOut({ scope: "local" });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch {
      onSavedWithoutSession();
      return;
    }
    trackEvent("first_login", { method: "checkout_success" });
    window.location.assign("/post-login");
  };

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-900 outline-none transition focus:border-[#4F5BFF] focus:ring-4 focus:ring-[#4F5BFF]/10";

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-slate-200 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Lock className="h-4 w-4 text-[#4F5BFF]" aria-hidden />
        {copy.passwordTitle}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          {copy.passwordLabel}
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            minLength={MIN_OWNER_PASSWORD_LENGTH}
            maxLength={MAX_OWNER_PASSWORD_LENGTH}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          {copy.passwordRepeatLabel}
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={inputClass}
            minLength={MIN_OWNER_PASSWORD_LENGTH}
            maxLength={MAX_OWNER_PASSWORD_LENGTH}
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
        {copy.passwordSubmit}
      </Button>
    </form>
  );
}
