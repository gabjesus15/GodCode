"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useLocale } from "next-intl";

import { cn } from "@/utils/cn";

const COPY = {
  es: {
    notify: "Te avisaremos a",
    saveError: "No se pudo guardar tu correo.",
    emailLabel: "Tu correo electrónico",
    emailPlaceholder: "tu@email.com",
    saving: "Guardando...",
    cta: "Avisame",
    noShare: "No compartimos tu correo con terceros. Puedes darte de baja cuando quieras.",
  },
  en: {
    notify: "We will notify you at",
    saveError: "Could not save your email.",
    emailLabel: "Your email",
    emailPlaceholder: "you@email.com",
    saving: "Saving...",
    cta: "Notify me",
    noShare: "We do not share your email with third parties. You can unsubscribe anytime.",
  },
  pt: {
    notify: "Vamos avisar voce no",
    saveError: "Nao foi possivel salvar seu email.",
    emailLabel: "Seu email",
    emailPlaceholder: "voce@email.com",
    saving: "Salvando...",
    cta: "Avise-me",
    noShare: "Nao compartilhamos seu email com terceiros. Voce pode cancelar quando quiser.",
  },
  fr: {
    notify: "Nous vous informerons a",
    saveError: "Impossible d'enregistrer votre email.",
    emailLabel: "Votre email",
    emailPlaceholder: "vous@email.com",
    saving: "Enregistrement...",
    cta: "M'avertir",
    noShare: "Nous ne partageons pas votre email avec des tiers. Vous pouvez vous desabonner a tout moment.",
  },
  de: {
    notify: "Wir benachrichtigen Sie unter",
    saveError: "Ihre E-Mail konnte nicht gespeichert werden.",
    emailLabel: "Ihre E-Mail",
    emailPlaceholder: "sie@email.com",
    saving: "Wird gespeichert...",
    cta: "Benachrichtige mich",
    noShare: "Wir teilen Ihre E-Mail nicht mit Dritten. Sie konnen sich jederzeit abmelden.",
  },
  it: {
    notify: "Ti avviseremo a",
    saveError: "Impossibile salvare la tua email.",
    emailLabel: "La tua email",
    emailPlaceholder: "tu@email.com",
    saving: "Salvataggio...",
    cta: "Avvisami",
    noShare: "Non condividiamo la tua email con terze parti. Puoi annullare quando vuoi.",
  },
} as const;

type SupportedLocale = keyof typeof COPY;

function getLocaleKey(locale: string): SupportedLocale {
  const code = locale.toLowerCase().split("-")[0];
  return (code in COPY ? (code as SupportedLocale) : "en");
}

export function LandingLeadForm({
  dark = false,
  className,
  layout = "inline",
}: {
  dark?: boolean;
  className?: string;
  /** `stacked`: columna y controles a ancho completo (tarjetas estrechas) */
  layout?: "inline" | "stacked";
}) {
  const locale = useLocale();
  const t = COPY[getLocaleKey(locale)];
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium",
          dark ? "text-emerald-300" : "text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        <Check className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t.notify} {email}</span>
      </p>
    );
  }

  const inputCls = dark
    ? "h-11 min-w-0 flex-1 rounded-xl border border-slate-600/80 bg-slate-900/60 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
    : "h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/50 sm:max-w-xs dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-indigo-500/40";

  const btnCls = dark
    ? cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md shadow-indigo-950/40 transition hover:bg-indigo-500 sm:px-8",
        layout === "stacked" ? "h-12 w-full" : "h-11 w-full sm:w-auto",
      )
    : "inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-zinc-200";

  const rowCls =
    dark && layout === "stacked"
      ? "flex flex-col gap-3"
      : "flex flex-col gap-3 sm:flex-row sm:items-stretch";

  const darkInputStacked =
    dark && layout === "stacked"
      ? "h-12 w-full rounded-xl border border-slate-600/80 bg-slate-950/60 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
      : null;

  return (
    <form
      className={cn("flex flex-col gap-3", className)}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email.trim() || loading) return;
        setLoading(true);
        setError(null);
        try {
          const res = await fetch("/api/landing/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error ?? t.saveError);
          }
          setSubmitted(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : t.saveError);
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className={rowCls}>
        <label className="sr-only" htmlFor="lead-email">
          {t.emailLabel}
        </label>
        <input
          id="lead-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          className={darkInputStacked ?? inputCls}
        />
        <button type="submit" className={btnCls}>
          {loading ? t.saving : t.cta}
        </button>
      </div>
      {error ? (
        <p className={cn("text-xs", dark ? "text-red-300" : "text-red-600")}>{error}</p>
      ) : null}
      {dark ? (
        <p className="text-center text-[11px] leading-relaxed text-slate-500 sm:text-left">
          {t.noShare}
        </p>
      ) : null}
    </form>
  );
}
