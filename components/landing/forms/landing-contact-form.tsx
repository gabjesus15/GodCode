"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";

const COPY = {
  es: {
    sendError: "No se pudo enviar tu mensaje.",
    sentTitle: "Mensaje enviado.",
    sentDesc: "Gracias por escribirnos. Te responderemos dentro de 24 horas al correo que ingresaste.",
    name: "Nombre",
    namePlaceholder: "Tu nombre",
    email: "Email",
    emailPlaceholder: "tu@email.com",
    message: "Mensaje",
    messagePlaceholder: "Cuéntanos tu rubro, tu ciudad y qué te gustaría lograr con tu tienda/menu.",
    sending: "Enviando...",
    send: "Enviar mensaje",
    direct: "También puedes escribir directo a",
  },
  en: {
    sendError: "Could not send your message.",
    sentTitle: "Message sent.",
    sentDesc: "Thanks for reaching out. We will reply within 24 hours to your email.",
    name: "Name",
    namePlaceholder: "Your name",
    email: "Email",
    emailPlaceholder: "you@email.com",
    message: "Message",
    messagePlaceholder: "Tell us your business type, city, and what you want to achieve with your store/menu.",
    sending: "Sending...",
    send: "Send message",
    direct: "You can also email us directly at",
  },
  pt: {
    sendError: "Nao foi possivel enviar sua mensagem.",
    sentTitle: "Mensagem enviada.",
    sentDesc: "Obrigado por nos escrever. Responderemos em ate 24 horas para o email informado.",
    name: "Nome",
    namePlaceholder: "Seu nome",
    email: "Email",
    emailPlaceholder: "voce@email.com",
    message: "Mensagem",
    messagePlaceholder: "Conte seu segmento, sua cidade e o que voce quer alcancar com sua loja/menu.",
    sending: "Enviando...",
    send: "Enviar mensagem",
    direct: "Voce tambem pode escrever direto para",
  },
  fr: {
    sendError: "Impossible d'envoyer votre message.",
    sentTitle: "Message envoye.",
    sentDesc: "Merci de nous avoir ecrit. Nous repondrons sous 24 heures a votre email.",
    name: "Nom",
    namePlaceholder: "Votre nom",
    email: "Email",
    emailPlaceholder: "vous@email.com",
    message: "Message",
    messagePlaceholder: "Dites-nous votre secteur, votre ville et ce que vous voulez accomplir avec votre boutique/menu.",
    sending: "Envoi...",
    send: "Envoyer le message",
    direct: "Vous pouvez aussi nous ecrire directement a",
  },
  de: {
    sendError: "Ihre Nachricht konnte nicht gesendet werden.",
    sentTitle: "Nachricht gesendet.",
    sentDesc: "Danke fur Ihre Nachricht. Wir antworten innerhalb von 24 Stunden an Ihre E-Mail.",
    name: "Name",
    namePlaceholder: "Ihr Name",
    email: "E-Mail",
    emailPlaceholder: "sie@email.com",
    message: "Nachricht",
    messagePlaceholder: "Nennen Sie Ihre Branche, Ihre Stadt und was Sie mit Ihrem Shop/Menu erreichen mochten.",
    sending: "Wird gesendet...",
    send: "Nachricht senden",
    direct: "Sie konnen uns auch direkt schreiben an",
  },
  it: {
    sendError: "Impossibile inviare il tuo messaggio.",
    sentTitle: "Messaggio inviato.",
    sentDesc: "Grazie per averci scritto. Ti risponderemo entro 24 ore all'email inserita.",
    name: "Nome",
    namePlaceholder: "Il tuo nome",
    email: "Email",
    emailPlaceholder: "tu@email.com",
    message: "Messaggio",
    messagePlaceholder: "Raccontaci il tuo settore, la tua citta e cosa vuoi ottenere con il tuo negozio/menu.",
    sending: "Invio in corso...",
    send: "Invia messaggio",
    direct: "Puoi anche scriverci direttamente a",
  },
} as const;

type SupportedLocale = keyof typeof COPY;

function getLocaleKey(locale: string): SupportedLocale {
  const code = locale.toLowerCase().split("-")[0];
  return (code in COPY ? (code as SupportedLocale) : "en");
}

export function LandingContactForm({
  supportEmail,
  dark = false,
  className,
}: {
  supportEmail: string;
  dark?: boolean;
  className?: string;
}) {
  const locale = useLocale();
  const t = COPY[getLocaleKey(locale)];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = message.trim().length >= 10 && !submitting;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/landing/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? t.sendError);
      }
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.sendError);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = dark
    ? "h-11 rounded-xl border border-slate-600/80 bg-slate-950/60 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
    : "h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-200/60 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-indigo-500/30 dark:focus:ring-indigo-500/20";

  const labelCls = dark
    ? "flex flex-col gap-1 text-sm font-medium text-slate-300"
    : "flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-zinc-200";

  const textareaCls = dark
    ? "resize-none rounded-xl border border-slate-600/80 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
    : "resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-200/60 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-indigo-500/30 dark:focus:ring-indigo-500/20";

  if (submitted) {
    return (
      <div className={cn("mt-6 rounded-xl border px-4 py-3 text-sm", dark ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700", className)}>
        <p className="font-medium">{t.sentTitle}</p>
        <p className="mt-1 text-xs opacity-90">
          {t.sentDesc}
        </p>
      </div>
    );
  }

  return (
    <form suppressHydrationWarning onSubmit={onSubmit} className={cn("mt-6 space-y-4", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          {t.name}
          <input
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          {t.email}
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className={inputCls}
          />
        </label>
      </div>
      <label className={labelCls}>
        {t.message}
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={dark ? 3 : 4}
          placeholder={t.messagePlaceholder}
          className={textareaCls}
        />
      </label>

      <Button
        type="submit"
        variant={dark ? "ghost" : "default"}
        disabled={!canSubmit}
        className={cn(
          dark
            ? "h-11 w-full border-0 bg-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-950/35 hover:bg-indigo-500 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent disabled:opacity-60 sm:h-12"
            : "h-10 w-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:w-auto",
        )}
      >
        {submitting ? t.sending : t.send}
      </Button>
      {error ? (
        <p className={cn("text-xs", dark ? "text-red-300" : "text-red-600")}>{error}</p>
      ) : null}
      <p className={cn("text-xs", dark ? "text-slate-500" : "text-slate-500 dark:text-zinc-400")}>
        {t.direct} {supportEmail}.
      </p>
    </form>
  );
}
