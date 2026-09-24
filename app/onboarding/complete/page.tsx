import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Clock, MailCheck } from "lucide-react";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCurrentLocale } from "@/lib/i18n/server";
import { resolvePlanMarketingLines, resolvePlanName } from "@/lib/plans/plan-i18n";
import { OnboardingStep2Form } from "@/components/onboarding/steps/OnboardingStep2Form";
import { OnboardingStepBar } from "@/components/onboarding/steps/OnboardingStepBar";

/** @service-role capability-token
 *
 * El verification_token del correo es la credencial.
 */

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
    title: "Elige el plan de {business}",
    subtitle: "Todos incluyen menú digital, pedidos online y caja. Puedes cambiar de plan cuando quieras.",
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
    paidTitle: "Tu pago ya está registrado",
    paidText: "Tu cuenta está lista o a punto de estarlo. Revisa tu correo: te enviamos el enlace para crear tu contraseña y entrar.",
    reviewTitle: "Estamos revisando tu comprobante",
    reviewText: "Ya recibimos tu comprobante. Te escribiremos por correo en cuanto lo validemos; no hace falta que vuelvas a pagar.",
    loginLabel: "Ir al login",
  },
  en: {
    title: "Choose a plan for {business}",
    subtitle: "Every plan includes a digital menu, online orders and POS. You can switch plans anytime.",
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
    paidTitle: "Your payment is already registered",
    paidText: "Your account is ready or almost ready. Check your email: we sent you the link to create your password and sign in.",
    reviewTitle: "We are reviewing your receipt",
    reviewText: "We already received your receipt. We will email you as soon as it is validated; you don’t need to pay again.",
    loginLabel: "Go to login",
  },
  pt: {
    title: "Escolha o plano de {business}",
    subtitle: "Todos incluem cardápio digital, pedidos online e caixa. Você pode trocar de plano quando quiser.",
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
    paidTitle: "Seu pagamento já está registrado",
    paidText: "Sua conta está pronta ou quase pronta. Confira seu e-mail: enviamos o link para criar sua senha e entrar.",
    reviewTitle: "Estamos revisando seu comprovante",
    reviewText: "Já recebemos seu comprovante. Vamos avisar por e-mail assim que for validado; não é preciso pagar novamente.",
    loginLabel: "Ir para o login",
  },
  fr: {
    title: "Choisissez l’offre de {business}",
    subtitle: "Toutes incluent menu digital, commandes en ligne et caisse. Vous pouvez changer d’offre à tout moment.",
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
    paidTitle: "Votre paiement est déjà enregistré",
    paidText: "Votre compte est prêt ou presque. Consultez votre e-mail : nous vous avons envoyé le lien pour créer votre mot de passe et vous connecter.",
    reviewTitle: "Nous vérifions votre justificatif",
    reviewText: "Nous avons bien reçu votre justificatif. Nous vous écrirons dès qu’il sera validé ; inutile de payer à nouveau.",
    loginLabel: "Aller à la connexion",
  },
  de: {
    title: "Wählen Sie den Plan für {business}",
    subtitle: "Alle enthalten digitale Speisekarte, Online-Bestellungen und Kasse. Sie können den Plan jederzeit wechseln.",
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
    paidTitle: "Ihre Zahlung ist bereits erfasst",
    paidText: "Ihr Konto ist bereit oder fast bereit. Prüfen Sie Ihre E-Mails: Wir haben Ihnen den Link zum Erstellen Ihres Passworts geschickt.",
    reviewTitle: "Wir prüfen Ihren Beleg",
    reviewText: "Wir haben Ihren Beleg erhalten. Wir schreiben Ihnen, sobald er bestätigt ist; Sie müssen nicht erneut zahlen.",
    loginLabel: "Zum Login",
  },
  it: {
    title: "Scegli il piano di {business}",
    subtitle: "Tutti includono menu digitale, ordini online e cassa. Puoi cambiare piano quando vuoi.",
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
    paidTitle: "Il tuo pagamento è già registrato",
    paidText: "Il tuo account è pronto o quasi. Controlla la tua email: ti abbiamo inviato il link per creare la password ed entrare.",
    reviewTitle: "Stiamo verificando la tua ricevuta",
    reviewText: "Abbiamo già ricevuto la tua ricevuta. Ti scriveremo appena sarà convalidata; non serve pagare di nuovo.",
    loginLabel: "Vai al login",
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

function ErrorCard({
  title,
  text,
  backHome,
  tone = "error",
  href = "/onboarding",
}: {
  title: string;
  text: string;
  backHome: string;
  tone?: "error" | "info" | "review";
  href?: string;
}) {
  const Icon = tone === "error" ? AlertCircle : tone === "review" ? Clock : MailCheck;
  const iconClass =
    tone === "error" ? "bg-red-50 text-red-600" : tone === "review" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8 sm:py-16">
      <OnboardingStepBar current={2} compact />
      <div className="rounded-2xl border border-slate-200 p-6 sm:p-8" role={tone === "error" ? "alert" : "status"}>
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
        <Link href={href} className="onboarding-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm">
          {backHome}
        </Link>
      </div>
    </main>
  );
}

type EditableApplication = {
  status: string;
  payment_status: string | null;
  payment_reference_url: string | null;
};

/**
 * Se puede volver a elegir plan o método mientras el pago no esté cobrado ni haya un
 * comprobante en revisión. Antes, en cuanto se pulsaba "Ir a pagar", este paso quedaba
 * cerrado y "Cambiar método de pago" terminaba en "Correo no verificado".
 */
function resolveApplicationStep(app: EditableApplication): "edit" | "paid" | "review" | "unverified" {
  if (app.status === "email_verified" || app.status === "form_completed") return "edit";
  if (app.payment_status === "paid" || app.status === "active" || app.status === "payment_validated") return "paid";
  if (app.status === "payment_pending") {
    if (app.payment_status === "pending_validation" && app.payment_reference_url) return "review";
    return "edit";
  }
  return "unverified";
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

  // Recién verificado el correo, el estado puede tardar un instante en verse.
  if (resolveApplicationStep(app) === "unverified") {
    await new Promise((r) => setTimeout(r, 800));
    const retry = await fetchApp();
    if (retry.error || !retry.app) {
      if (retry.error) console.error("[ONBOARDING COMPLETE] Error en reintento:", retry.error);
      return <ErrorCard title={copy.errorTitle} text={copy.errorText} backHome={copy.backHome} />;
    }
    app = retry.app;
  }

  const step = resolveApplicationStep(app);
  if (step === "unverified") {
    return <ErrorCard title={copy.emailTitle} text={copy.emailText} backHome={copy.backHome} />;
  }
  if (step === "paid") {
    return <ErrorCard tone="info" title={copy.paidTitle} text={copy.paidText} backHome={copy.loginLabel} href="/login" />;
  }
  if (step === "review") {
    return <ErrorCard tone="review" title={copy.reviewTitle} text={copy.reviewText} backHome={copy.backHome} />;
  }

  const [plansResult, addonsResult, applicationAddonsResult] = await Promise.all([
    // Solo planes a la venta: los internos (dev, promos) no se contratan desde aquí.
    supabaseAdmin.from("plans").select("id,name,name_i18n,price,prices_by_continent,max_branches,marketing_lines,marketing_lines_i18n").eq("is_active", true).eq("is_public", true).order("price", { ascending: true }),
    supabaseAdmin.from("addons").select("id,slug,name,description,price_one_time,price_monthly,type,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
    supabaseAdmin.from("onboarding_application_addons").select("addon_id,quantity").eq("application_id", app.id),
  ]);

  if (plansResult.error) {
    console.error("[ONBOARDING COMPLETE] Error al cargar planes:", plansResult.error);
    return <ErrorCard title={copy.plansErrorTitle} text={copy.plansErrorText} backHome={copy.backHome} />;
  }

  const plans = (plansResult.data ?? []).map((plan) => {
    const row = plan as typeof plan & { name_i18n?: unknown; marketing_lines?: unknown; marketing_lines_i18n?: unknown };
    return {
      id: row.id,
      price: row.price,
      prices_by_continent: row.prices_by_continent,
      max_branches: row.max_branches,
      name: resolvePlanName({ locale, name: row.name, nameI18n: row.name_i18n }),
      features: resolvePlanMarketingLines({ locale, marketingLines: row.marketing_lines, marketingLinesI18n: row.marketing_lines_i18n }),
    };
  });
  const addons = addonsResult.data ?? [];
  const applicationAddons = applicationAddonsResult.data ?? [];

  if (plans.length === 0) {
    return <ErrorCard title={copy.noPlansTitle} text={copy.noPlansText} backHome={copy.backHome} />;
  }

  const businessName = String(app.business_name ?? "").trim();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-14">
      <OnboardingStepBar current={2} />

      <div className="mb-10 max-w-2xl">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {copy.title.replace("{business}", businessName)}
        </h1>
        <p className="mt-3 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
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
