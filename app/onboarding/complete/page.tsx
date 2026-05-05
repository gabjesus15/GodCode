import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCurrentLocale } from "@/lib/i18n/server";
import { resolvePlanName } from "@/lib/plans/plan-i18n";
import { OnboardingStep2Form } from "@/components/onboarding/steps/OnboardingStep2Form";
import { OnboardingStepBar } from "@/components/onboarding/steps/OnboardingStepBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

const COMPLETE_COPY = {
  es: {
    title: "Elige tu plan",
    subtitle: "Selecciona el plan que necesitas, añade extras si quieres, y continúa al pago.",
    backHome: "Volver al inicio",
    errorTitle: "Error de registro",
    errorText: "No se pudo cargar la aplicación. Intenta de nuevo o contacta soporte.",
    notFoundTitle: "Aplicación no encontrada",
    notFoundText: "El enlace es inválido o la aplicación no existe.",
    emailTitle: "Correo no verificado",
    emailText: "Debes verificar tu correo antes de continuar. Revisa tu bandeja y haz clic en el enlace de verificación.",
    plansErrorTitle: "Error al cargar planes",
    plansErrorText: "No pudimos obtener los planes disponibles. Intenta de nuevo en unos minutos.",
    noPlansTitle: "Sin planes disponibles",
    noPlansText: "No hay planes activos en este momento. Contacta a soporte para más información.",
  },
  en: {
    title: "Choose your plan",
    subtitle: "Select the plan you need, add extras if you want, and continue to payment.",
    backHome: "Back to start",
    errorTitle: "Registration error",
    errorText: "We could not load the application. Try again or contact support.",
    notFoundTitle: "Application not found",
    notFoundText: "The link is invalid or the application does not exist.",
    emailTitle: "Email not verified",
    emailText: "You must verify your email before continuing. Check your inbox and click the verification link.",
    plansErrorTitle: "Error loading plans",
    plansErrorText: "We could not load the available plans. Try again in a few minutes.",
    noPlansTitle: "No plans available",
    noPlansText: "There are no active plans right now. Contact support for more information.",
  },
  pt: {
    title: "Escolha seu plano",
    subtitle: "Selecione o plano que você precisa, adicione extras se quiser e continue para o pagamento.",
    backHome: "Voltar ao início",
    errorTitle: "Erro de cadastro",
    errorText: "Não foi possível carregar a aplicação. Tente novamente ou contate o suporte.",
    notFoundTitle: "Aplicação não encontrada",
    notFoundText: "O link é inválido ou a aplicação não existe.",
    emailTitle: "E-mail não verificado",
    emailText: "Você precisa verificar seu e-mail antes de continuar. Verifique sua caixa de entrada e clique no link de verificação.",
    plansErrorTitle: "Erro ao carregar planos",
    plansErrorText: "Não conseguimos obter os planos disponíveis. Tente novamente em alguns minutos.",
    noPlansTitle: "Sem planos disponíveis",
    noPlansText: "Não há planos ativos no momento. Contate o suporte para mais informações.",
  },
  fr: {
    title: "Choisissez votre offre",
    subtitle: "Sélectionnez l’offre dont vous avez besoin, ajoutez des extras si vous le souhaitez, puis continuez vers le paiement.",
    backHome: "Retour au début",
    errorTitle: "Erreur d’inscription",
    errorText: "Nous n’avons pas pu charger la demande. Réessayez ou contactez le support.",
    notFoundTitle: "Demande introuvable",
    notFoundText: "Le lien est invalide ou la demande n’existe pas.",
    emailTitle: "E-mail non vérifié",
    emailText: "Vous devez vérifier votre e-mail avant de continuer. Consultez votre boîte de réception et cliquez sur le lien de vérification.",
    plansErrorTitle: "Erreur de chargement des offres",
    plansErrorText: "Nous n’avons pas pu récupérer les offres disponibles. Réessayez dans quelques minutes.",
    noPlansTitle: "Aucune offre disponible",
    noPlansText: "Il n’y a aucune offre active pour le moment. Contactez le support pour plus d’informations.",
  },
  de: {
    title: "Wählen Sie Ihren Plan",
    subtitle: "Wählen Sie den gewünschten Plan, fügen Sie bei Bedarf Extras hinzu und fahren Sie mit der Zahlung fort.",
    backHome: "Zurück zum Start",
    errorTitle: "Registrierungsfehler",
    errorText: "Die Anfrage konnte nicht geladen werden. Versuchen Sie es erneut oder kontaktieren Sie den Support.",
    notFoundTitle: "Anfrage nicht gefunden",
    notFoundText: "Der Link ist ungültig oder die Anfrage existiert nicht.",
    emailTitle: "E-Mail nicht bestätigt",
    emailText: "Sie müssen Ihre E-Mail bestätigen, bevor Sie fortfahren. Prüfen Sie Ihren Posteingang und klicken Sie auf den Bestätigungslink.",
    plansErrorTitle: "Fehler beim Laden der Pläne",
    plansErrorText: "Die verfügbaren Pläne konnten nicht geladen werden. Versuchen Sie es in wenigen Minuten erneut.",
    noPlansTitle: "Keine Pläne verfügbar",
    noPlansText: "Derzeit sind keine aktiven Pläne verfügbar. Kontaktieren Sie den Support für weitere Informationen.",
  },
  it: {
    title: "Scegli il tuo piano",
    subtitle: "Seleziona il piano di cui hai bisogno, aggiungi extra se vuoi e continua al pagamento.",
    backHome: "Torna all’inizio",
    errorTitle: "Errore di registrazione",
    errorText: "Non è stato possibile caricare la richiesta. Riprova o contatta il supporto.",
    notFoundTitle: "Richiesta non trovata",
    notFoundText: "Il link è non valido o la richiesta non esiste.",
    emailTitle: "Email non verificata",
    emailText: "Devi verificare la tua email prima di continuare. Controlla la posta in arrivo e fai clic sul link di verifica.",
    plansErrorTitle: "Errore nel caricamento dei piani",
    plansErrorText: "Non siamo riusciti a recuperare i piani disponibili. Riprova tra qualche minuto.",
    noPlansTitle: "Nessun piano disponibile",
    noPlansText: "Non ci sono piani attivi al momento. Contatta il supporto per maggiori informazioni.",
  },
} as const;

function getCompleteCopy(locale: string) {
  const normalized = String(locale ?? "es").toLowerCase();
  const short = normalized.startsWith("en")
    ? "en"
    : normalized.startsWith("pt")
      ? "pt"
      : normalized.startsWith("fr")
        ? "fr"
        : normalized.startsWith("de")
          ? "de"
          : normalized.startsWith("it")
            ? "it"
            : "es";
  return COMPLETE_COPY[short as keyof typeof COMPLETE_COPY] ?? COMPLETE_COPY.es;
}

function ErrorCard({ title, text, backHome }: { title: string; text: string; backHome: string }) {
  return (
    <main className="onboarding-main relative mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <OnboardingStepBar current={2} />
      <div className="onboarding-card mx-auto max-w-md p-6 text-center sm:p-8">
        <h2 className="text-lg font-bold text-red-600">{title}</h2>
        <p className="mt-3 text-sm text-slate-500">{text}</p>
        <Link href="/onboarding" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          {backHome}
        </Link>
      </div>
    </main>
  );
}

export default async function OnboardingCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const raw = await searchParams;
  const tokenRaw = raw?.token;
  const token =
    typeof tokenRaw === "string"
      ? tokenRaw.trim()
      : Array.isArray(tokenRaw) && tokenRaw.length > 0
        ? String(tokenRaw[0]).trim()
        : null;
  if (!token) redirect("/onboarding?from=complete&reason=no_token");

  const locale = await getCurrentLocale();
  const copy = getCompleteCopy(locale);

  async function fetchApp() {
    const { data, error } = await supabaseAdmin
      .from("onboarding_applications")
      .select("*")
      .eq("verification_token", token)
      .maybeSingle();
    return { app: data, error };
  }

  const initialFetch = await fetchApp();
  let app = initialFetch.app;
  const error = initialFetch.error;

  if (error) {
    console.error("[ONBOARDING COMPLETE] Error al cargar aplicación:", error);
    return <ErrorCard title={copy.errorTitle} text={copy.errorText} backHome={copy.backHome} />;
  }
  if (!app) {
    return <ErrorCard title={copy.notFoundTitle} text={copy.notFoundText} backHome={copy.backHome} />;
  }

  if (app.status !== "email_verified" && app.status !== "form_completed") {
    await new Promise((r) => setTimeout(r, 800));
    const retry = await fetchApp();
    if (retry.error || !retry.app) {
      if (retry.error) console.error("[ONBOARDING COMPLETE] Error en reintento:", retry.error);
      return <ErrorCard title={copy.errorTitle} text={copy.errorText} backHome={copy.backHome} />;
    }
    app = retry.app;
  }

  if (app.status !== "email_verified" && app.status !== "form_completed") {
    return <ErrorCard title={copy.emailTitle} text={copy.emailText} backHome={copy.backHome} />;
  }

  const [plansResult, addonsResult, applicationAddonsResult] = await Promise.all([
     supabaseAdmin.from("plans").select("id,name,name_i18n,price,prices_by_continent,max_branches").eq("is_active", true).order("price", { ascending: true }),
    supabaseAdmin.from("addons").select("id,slug,name,description,price_one_time,price_monthly,type,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
    supabaseAdmin.from("onboarding_application_addons").select("addon_id,quantity,price_snapshot").eq("application_id", app.id),
  ]);

  if (plansResult.error) {
    console.error("[ONBOARDING COMPLETE] Error al cargar planes:", plansResult.error);
    return <ErrorCard title={copy.plansErrorTitle} text={copy.plansErrorText} backHome={copy.backHome} />;
  }

  const plans = (plansResult.data ?? []).map((plan) => ({
    ...plan,
    name: resolvePlanName({ locale, name: plan.name, nameI18n: (plan as { name_i18n?: unknown }).name_i18n }),
  }));
  const addons = addonsResult.data ?? [];
  const applicationAddons = applicationAddonsResult.data ?? [];

  if (plans.length === 0) {
    return <ErrorCard title={copy.noPlansTitle} text={copy.noPlansText} backHome={copy.backHome} />;
  }

  return (
    <main className="onboarding-main relative mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
      <OnboardingStepBar current={2} />

      <div className="mb-8 text-center sm:mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500 sm:text-base">
          {copy.subtitle}
        </p>
      </div>

      <OnboardingStep2Form
        token={token}
        initialData={{
          plan_id: app.plan_id,
          country: app.country,
          currency: app.currency,
          subscription_payment_method: app.subscription_payment_method,
          addons: applicationAddons,
          email: app.email,
        }}
        plans={plans}
        addons={addons}
      />
    </main>
  );
}
