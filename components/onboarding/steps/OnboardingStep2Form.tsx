"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { Building2, Check, CreditCard, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resolveAddonUnitPrice } from "@/lib/plans/addon-pricing";
import { resolveRegionalPlanPrice, resolveContinentFromCountryInput } from "@/lib/plans/plan-regional-pricing";
import { cn } from "@/utils/cn";

type Plan = {
  id: string;
  name: string | null;
  price: number | null;
  pricesByContinent?: Record<string, { price: number; currency: string }> | null;
  max_branches: number | null;
  /** Qué incluye, ya en el idioma de la página (líneas de marketing del plan). */
  features?: string[];
};

type PaymentMethodOption = {
  slug: string;
  label: string;
  description: string;
};

const BETA_PLAN_NAMES = ["beta"];
/** Tope de sucursales que en la base significa "sin límite". */
const UNLIMITED_BRANCHES = 999;

function isPlanBeta(plan: Plan): boolean {
  const n = (plan.name ?? "").toLowerCase().trim();
  return BETA_PLAN_NAMES.some((k) => n === k || n.startsWith(`${k} `) || n.endsWith(` ${k}`));
}
type PlanPaymentMethod = { id: string; slug: string; name: string | null; auto_verify: boolean; sort_order: number };
type Addon = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  price_one_time: number | null;
  price_monthly: number | null;
  type: string;
  sort_order: number;
};
/** El precio no viaja: el servidor lo toma de la tabla de extras al cobrar. */
type AddonChoice = { addon_id: string; quantity: number };

const STEP2_COPY = {
  es: {
    businessSection: "Tu negocio",
    businessSectionHint: "Con tu país calculamos el precio del plan y los métodos de pago disponibles.",
    countryLabel: "País",
    countryPlaceholder: "Selecciona tu país",
    currencyLabel: "Moneda de tus precios",
    currencyHint: "La de los precios de tu menú. El plan se cobra en dólares.",
    currencyPlaceholder: "Selecciona la moneda",
    planLabel: "Plan",
    planHint: "Puedes cambiarlo cuando quieras desde tu cuenta.",
    addonsLabel: "Extras",
    addonsHint: "Opcionales. También puedes sumarlos más adelante.",
    summaryLabel: "Resumen",
    summaryEmpty: "Elige un plan para ver el total.",
    monthlyTotalLabel: "Total mensual",
    oneTimeLabel: "Pago único",
    paymentMethodLabel: "Cómo vas a pagar",
    paymentMethodHint: "Solo aparecen los métodos disponibles en tu país.",
    paypalDescription: "Con tu cuenta PayPal o con tarjeta. Se activa al instante.",
    manualDescription: "Te damos los datos para transferir y subes el comprobante.",
    continueButton: "Continuar al pago",
    noChargeNote: "Todavía no se cobra nada: en el siguiente paso eliges cuántos meses pagar.",
    betaUsedLabel: "Ya usaste el plan beta.",
    monthsSuffix: "/mes",
    planRegionPrefix: "Precio para",
    branchesSuffixSingular: "sucursal",
    branchesSuffixPlural: "sucursales",
    upToPrefix: "Hasta",
    unlimitedBranches: "Sucursales ilimitadas",
    oneTimeSuffix: " pago único",
    selectCountryFirst: "Elige tu país para ver los métodos de pago.",
    noMethods: "No hay métodos de pago disponibles para este país. Escríbenos y lo resolvemos.",
    methodsLoadError: "No pudimos cargar los métodos de pago. Revisa tu conexión y vuelve a intentarlo.",
    saveError: "No pudimos guardar tus datos. Intenta de nuevo.",
  },
  en: {
    businessSection: "Your business",
    businessSectionHint: "Your country sets the plan price and the payment methods available.",
    countryLabel: "Country",
    countryPlaceholder: "Select your country",
    currencyLabel: "Currency of your prices",
    currencyHint: "The one used on your menu. The plan is charged in US dollars.",
    currencyPlaceholder: "Select the currency",
    planLabel: "Plan",
    planHint: "You can change it anytime from your account.",
    addonsLabel: "Extras",
    addonsHint: "Optional. You can also add them later.",
    summaryLabel: "Summary",
    summaryEmpty: "Choose a plan to see the total.",
    monthlyTotalLabel: "Monthly total",
    oneTimeLabel: "One-time payment",
    paymentMethodLabel: "How you will pay",
    paymentMethodHint: "Only methods available in your country are shown.",
    paypalDescription: "With your PayPal account or a card. Activates instantly.",
    manualDescription: "We give you the transfer details and you upload the receipt.",
    continueButton: "Continue to payment",
    noChargeNote: "Nothing is charged yet: in the next step you choose how many months to pay.",
    betaUsedLabel: "You already used the beta plan.",
    monthsSuffix: "/month",
    planRegionPrefix: "Price for",
    branchesSuffixSingular: "branch",
    branchesSuffixPlural: "branches",
    upToPrefix: "Up to",
    unlimitedBranches: "Unlimited branches",
    oneTimeSuffix: " one-time",
    selectCountryFirst: "Choose your country to see the payment methods.",
    noMethods: "No payment methods are available for this country. Write to us and we will sort it out.",
    methodsLoadError: "We couldn’t load the payment methods. Check your connection and try again.",
    saveError: "We couldn’t save your details. Please try again.",
  },
  pt: {
    businessSection: "Seu negócio",
    businessSectionHint: "Com seu país calculamos o preço do plano e os métodos de pagamento disponíveis.",
    countryLabel: "País",
    countryPlaceholder: "Selecione seu país",
    currencyLabel: "Moeda dos seus preços",
    currencyHint: "A dos preços do seu cardápio. O plano é cobrado em dólares.",
    currencyPlaceholder: "Selecione a moeda",
    planLabel: "Plano",
    planHint: "Você pode mudá-lo quando quiser na sua conta.",
    addonsLabel: "Extras",
    addonsHint: "Opcionais. Você também pode adicioná-los depois.",
    summaryLabel: "Resumo",
    summaryEmpty: "Escolha um plano para ver o total.",
    monthlyTotalLabel: "Total mensal",
    oneTimeLabel: "Pagamento único",
    paymentMethodLabel: "Como você vai pagar",
    paymentMethodHint: "Só aparecem os métodos disponíveis no seu país.",
    paypalDescription: "Com sua conta PayPal ou cartão. Ativa na hora.",
    manualDescription: "Damos os dados para transferir e você envia o comprovante.",
    continueButton: "Continuar para o pagamento",
    noChargeNote: "Nada é cobrado ainda: no próximo passo você escolhe quantos meses pagar.",
    betaUsedLabel: "Você já usou o plano beta.",
    monthsSuffix: "/mês",
    planRegionPrefix: "Preço para",
    branchesSuffixSingular: "filial",
    branchesSuffixPlural: "filiais",
    upToPrefix: "Até",
    unlimitedBranches: "Filiais ilimitadas",
    oneTimeSuffix: " pagamento único",
    selectCountryFirst: "Escolha seu país para ver os métodos de pagamento.",
    noMethods: "Não há métodos de pagamento disponíveis para este país. Fale conosco e resolvemos.",
    methodsLoadError: "Não foi possível carregar os métodos de pagamento. Verifique sua conexão e tente novamente.",
    saveError: "Não foi possível salvar seus dados. Tente novamente.",
  },
  fr: {
    businessSection: "Votre établissement",
    businessSectionHint: "Votre pays détermine le prix de l’offre et les moyens de paiement disponibles.",
    countryLabel: "Pays",
    countryPlaceholder: "Sélectionnez votre pays",
    currencyLabel: "Devise de vos prix",
    currencyHint: "Celle de votre menu. L’offre est facturée en dollars.",
    currencyPlaceholder: "Sélectionnez la devise",
    planLabel: "Offre",
    planHint: "Vous pouvez la changer à tout moment depuis votre compte.",
    addonsLabel: "Extras",
    addonsHint: "Facultatifs. Vous pouvez aussi les ajouter plus tard.",
    summaryLabel: "Récapitulatif",
    summaryEmpty: "Choisissez une offre pour voir le total.",
    monthlyTotalLabel: "Total mensuel",
    oneTimeLabel: "Paiement unique",
    paymentMethodLabel: "Comment vous allez payer",
    paymentMethodHint: "Seuls les moyens disponibles dans votre pays apparaissent.",
    paypalDescription: "Avec votre compte PayPal ou une carte. Activation immédiate.",
    manualDescription: "Nous vous donnons les coordonnées du virement et vous envoyez le justificatif.",
    continueButton: "Continuer vers le paiement",
    noChargeNote: "Rien n’est encore facturé : à l’étape suivante vous choisissez le nombre de mois.",
    betaUsedLabel: "Vous avez déjà utilisé l’offre bêta.",
    monthsSuffix: "/mois",
    planRegionPrefix: "Prix pour",
    branchesSuffixSingular: "succursale",
    branchesSuffixPlural: "succursales",
    upToPrefix: "Jusqu’à",
    unlimitedBranches: "Succursales illimitées",
    oneTimeSuffix: " paiement unique",
    selectCountryFirst: "Choisissez votre pays pour voir les moyens de paiement.",
    noMethods: "Aucun moyen de paiement n’est disponible pour ce pays. Écrivez-nous et nous trouverons une solution.",
    methodsLoadError: "Impossible de charger les moyens de paiement. Vérifiez votre connexion et réessayez.",
    saveError: "Impossible d’enregistrer vos données. Réessayez.",
  },
  de: {
    businessSection: "Ihr Geschäft",
    businessSectionHint: "Ihr Land bestimmt den Planpreis und die verfügbaren Zahlungsmethoden.",
    countryLabel: "Land",
    countryPlaceholder: "Land auswählen",
    currencyLabel: "Währung Ihrer Preise",
    currencyHint: "Die Ihrer Speisekarte. Der Plan wird in US-Dollar berechnet.",
    currencyPlaceholder: "Währung auswählen",
    planLabel: "Plan",
    planHint: "Sie können ihn jederzeit in Ihrem Konto ändern.",
    addonsLabel: "Extras",
    addonsHint: "Optional. Sie können sie auch später hinzufügen.",
    summaryLabel: "Zusammenfassung",
    summaryEmpty: "Wählen Sie einen Plan, um die Summe zu sehen.",
    monthlyTotalLabel: "Monatliche Summe",
    oneTimeLabel: "Einmalige Zahlung",
    paymentMethodLabel: "Wie Sie bezahlen",
    paymentMethodHint: "Es erscheinen nur die in Ihrem Land verfügbaren Methoden.",
    paypalDescription: "Mit Ihrem PayPal-Konto oder Karte. Sofort aktiv.",
    manualDescription: "Wir geben Ihnen die Überweisungsdaten, Sie laden den Beleg hoch.",
    continueButton: "Weiter zur Zahlung",
    noChargeNote: "Noch wird nichts berechnet: Im nächsten Schritt wählen Sie die Anzahl der Monate.",
    betaUsedLabel: "Sie haben den Beta-Plan bereits genutzt.",
    monthsSuffix: "/Monat",
    planRegionPrefix: "Preis für",
    branchesSuffixSingular: "Filiale",
    branchesSuffixPlural: "Filialen",
    upToPrefix: "Bis zu",
    unlimitedBranches: "Unbegrenzte Filialen",
    oneTimeSuffix: " einmalig",
    selectCountryFirst: "Wählen Sie Ihr Land, um die Zahlungsmethoden zu sehen.",
    noMethods: "Für dieses Land sind keine Zahlungsmethoden verfügbar. Schreiben Sie uns, wir lösen das.",
    methodsLoadError: "Die Zahlungsmethoden konnten nicht geladen werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    saveError: "Ihre Daten konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.",
  },
  it: {
    businessSection: "La tua attività",
    businessSectionHint: "Dal tuo paese dipendono il prezzo del piano e i metodi di pagamento disponibili.",
    countryLabel: "Paese",
    countryPlaceholder: "Seleziona il tuo paese",
    currencyLabel: "Valuta dei tuoi prezzi",
    currencyHint: "Quella del tuo menu. Il piano si paga in dollari.",
    currencyPlaceholder: "Seleziona la valuta",
    planLabel: "Piano",
    planHint: "Puoi cambiarlo quando vuoi dal tuo account.",
    addonsLabel: "Extra",
    addonsHint: "Facoltativi. Puoi aggiungerli anche in seguito.",
    summaryLabel: "Riepilogo",
    summaryEmpty: "Scegli un piano per vedere il totale.",
    monthlyTotalLabel: "Totale mensile",
    oneTimeLabel: "Pagamento unico",
    paymentMethodLabel: "Come pagherai",
    paymentMethodHint: "Compaiono solo i metodi disponibili nel tuo paese.",
    paypalDescription: "Con il tuo account PayPal o con carta. Attivo subito.",
    manualDescription: "Ti diamo i dati per il bonifico e carichi la ricevuta.",
    continueButton: "Continua al pagamento",
    noChargeNote: "Non addebitiamo ancora nulla: nel passaggio successivo scegli quanti mesi pagare.",
    betaUsedLabel: "Hai già usato il piano beta.",
    monthsSuffix: "/mese",
    planRegionPrefix: "Prezzo per",
    branchesSuffixSingular: "filiale",
    branchesSuffixPlural: "filiali",
    upToPrefix: "Fino a",
    unlimitedBranches: "Filiali illimitate",
    oneTimeSuffix: " pagamento unico",
    selectCountryFirst: "Scegli il tuo paese per vedere i metodi di pagamento.",
    noMethods: "Non ci sono metodi di pagamento disponibili per questo paese. Scrivici e lo risolviamo.",
    methodsLoadError: "Impossibile caricare i metodi di pagamento. Controlla la connessione e riprova.",
    saveError: "Impossibile salvare i tuoi dati. Riprova.",
  },
} as const;

function getStep2Copy(locale: string) {
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
  return STEP2_COPY[short as keyof typeof STEP2_COPY] ?? STEP2_COPY.es;
}

function normalizeSubscriptionMethod(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

// Los planes se cobran en dólares: con decimales cuando los hay (19,99 no es 20).
const usdFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const COUNTRIES = [
  "Venezuela",
  "Chile",
  "Colombia",
  "Argentina",
  "México",
  "Perú",
  "Ecuador",
  "España",
  "Estados Unidos",
  "Otro",
] as const;

const CURRENCIES = [
  { value: "VES", label: "Bolívar (VES)" },
  { value: "USD", label: "Dólar (USD)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "Otro", label: "Otra" },
] as const;

const selectClass = "h-12 w-full rounded-xl border px-4 text-[15px] outline-none";

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function OnboardingStep2Form({
  token,
  initialData,
  plans,
  addons = [],
}: {
  token: string;
  initialData: {
    plan_id?: string | null;
    country?: string | null;
    currency?: string | null;
    subscription_payment_method?: string | null;
    addons?: { addon_id: string; quantity?: number; price_snapshot?: number | null }[];
    email?: string | null;
  };
  plans: Plan[];
  addons?: Addon[];
}) {
  const locale = useLocale();
  const copy = useMemo(() => getStep2Copy(locale), [locale]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planPaymentMethods, setPlanPaymentMethods] = useState<PlanPaymentMethod[]>([]);
  const [planMethodsLoadState, setPlanMethodsLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const [selectedAddons, setSelectedAddons] = useState<AddonChoice[]>(() => {
    const fromInitial = initialData.addons ?? [];
    return fromInitial.map((a) => ({
      addon_id: a.addon_id,
      quantity: Math.max(1, Number(a.quantity) || 1),
    }));
  });

  const [country, setCountry] = useState(initialData.country ?? "");
  const [currency, setCurrency] = useState(initialData.currency ?? "");
  const [planId, setPlanId] = useState(initialData.plan_id ?? "");
  const [subMethod, setSubMethod] = useState(normalizeSubscriptionMethod(initialData.subscription_payment_method));

  // Beta restriction
  const [betaDisabled, setBetaDisabled] = useState(false);
  useEffect(() => {
    async function checkBeta() {
      const betaPlan = plans.find(isPlanBeta);
      if (!betaPlan || !initialData.email) { setBetaDisabled(false); return; }
      try {
        const res = await fetch(`/api/onboarding/check-beta?email=${encodeURIComponent(initialData.email)}&plan_id=${betaPlan.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setBetaDisabled(json.used === true);
      } catch { setBetaDisabled(false); }
    }
    checkBeta();
  }, [initialData.email, plans]);

  // Load payment methods by country
  useEffect(() => {
    const c = country.trim();
    if (!c) { setPlanPaymentMethods([]); setPlanMethodsLoadState("idle"); return; }
    setPlanMethodsLoadState("loading");
    let cancelled = false;
    fetch(`/api/onboarding/plan-payment-methods?country=${encodeURIComponent(c)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { data?: PlanPaymentMethod[] }) => {
        if (cancelled) return;
        setPlanPaymentMethods(Array.isArray(json.data) ? json.data : []);
        setPlanMethodsLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setPlanPaymentMethods([]);
        setPlanMethodsLoadState("error");
      });
    return () => { cancelled = true; };
  }, [country]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#payment-method") return;

    const section = document.getElementById("payment-method");
    if (!section) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstInput = section.querySelector<HTMLInputElement>('input[name="sub_method"]');
    firstInput?.focus();
  }, []);

  // Reset manual method if not available
  useEffect(() => {
    if (planMethodsLoadState !== "ready") return;
    setSubMethod((prev) => {
      const allowed = new Set(planPaymentMethods.map((p) => (p.slug ?? "").trim().toLowerCase()).filter(Boolean));
      if (allowed.has(prev)) return prev;
      const fallback = planPaymentMethods[0]?.slug?.trim().toLowerCase() ?? "";
      return fallback;
    });
  }, [planPaymentMethods, planMethodsLoadState]);

  const paymentMethodOptions = useMemo<PaymentMethodOption[]>(() => {
    return planPaymentMethods.map((method) => {
      const slug = (method.slug ?? "").trim().toLowerCase();
      if (slug === "paypal") {
        return {
          slug,
          label: "PayPal",
          description: copy.paypalDescription,
        };
      }
      return {
        slug,
        label: method.name ?? method.slug,
        description: copy.manualDescription,
      };
    });
  }, [copy.manualDescription, copy.paypalDescription, planPaymentMethods]);
  const selectedPlan = plans.find((p) => p.id === planId);
  const selectedCountryRegion = useMemo(() => resolveContinentFromCountryInput(country), [country]);
  const selectedPlanRegionalPrice = useMemo(
    () => (selectedPlan ? resolveRegionalPlanPrice(selectedPlan, country) : null),
    [selectedPlan, country],
  );

  // Cart summary
  const cartLines = useMemo(() => {
    const lines: { label: string; amount: number; type: "monthly" | "one_time" }[] = [];
    if (selectedPlan) {
      lines.push({
        label: `${selectedPlan.name ?? "Plan"} · ${selectedCountryRegion}`,
        amount: Number(selectedPlanRegionalPrice?.price ?? selectedPlan.price ?? 0),
        type: "monthly",
      });
    }
    for (const sa of selectedAddons) {
      const addon = addons.find((a) => a.id === sa.addon_id);
      if (!addon) continue;
      const { isMonthly, unitPrice } = resolveAddonUnitPrice(addon);
      lines.push({
        label: addon.name ?? addon.slug,
        amount: unitPrice,
        type: isMonthly ? "monthly" : "one_time",
      });
    }
    return lines;
  }, [selectedPlan, selectedCountryRegion, selectedPlanRegionalPrice, selectedAddons, addons]);

  const monthlyTotal = cartLines.filter((l) => l.type === "monthly").reduce((s, l) => s + l.amount, 0);
  const oneTimeTotal = cartLines.filter((l) => l.type === "one_time").reduce((s, l) => s + l.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          plan_id: planId || undefined,
          country: country || undefined,
          currency: currency || undefined,
          subscription_payment_method: subMethod,
          addons: selectedAddons.length > 0 ? selectedAddons : undefined,
          payment_methods: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? copy.saveError);
      window.location.href = `/onboarding/pago?token=${encodeURIComponent(token)}`;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : copy.saveError);
    } finally {
      setLoading(false);
    }
  };

  // El servidor ya manda solo los planes a la venta (activos y públicos).
  const visiblePlans = plans;

  return (
    <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
      <div className="min-w-0 space-y-12">
        <section className="space-y-5">
          <SectionHeading title={copy.businessSection} hint={copy.businessSectionHint} />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">
              {copy.countryLabel}
              <select className={selectClass} value={country} onChange={(e) => setCountry(e.target.value)} required>
                <option value="">{copy.countryPlaceholder}</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">
              {copy.currencyLabel}
              <select className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)} required>
                <option value="">{copy.currencyPlaceholder}</option>
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <span className="text-xs font-normal text-slate-500">{copy.currencyHint}</span>
            </label>
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading title={copy.planLabel} hint={copy.planHint} />
          {/* 3 o 6 planes en filas de tres; 2, 4 o 5 en filas de dos (sin una tarjeta sola al final). */}
          <div
            role="radiogroup"
            aria-label={copy.planLabel}
            className={cn("grid gap-3", visiblePlans.length > 1 && (visiblePlans.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-2"))}
          >
            {visiblePlans.map((plan) => {
              const isBeta = isPlanBeta(plan);
              const selected = planId === plan.id;
              const disabled = isBeta && betaDisabled;
              const regional = resolveRegionalPlanPrice(plan, country);
              const branches = isBeta ? 2 : Number(plan.max_branches ?? 1);
              const branchLine = branches >= UNLIMITED_BRANCHES
                ? copy.unlimitedBranches
                : `${copy.upToPrefix} ${branches} ${branches > 1 ? copy.branchesSuffixPlural : copy.branchesSuffixSingular}`;
              const features = [branchLine, ...(plan.features ?? []).filter((line) => line.trim() && line !== branchLine)].slice(0, 6);
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => setPlanId(plan.id)}
                  data-selected={selected}
                  data-disabled={disabled}
                  className="onboarding-option relative flex flex-col rounded-2xl p-5 text-left"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{plan.name ?? "Plan"}</span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white",
                      )}
                      aria-hidden
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                  </span>
                  <span className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                    {usdFmt.format(Number(regional.price))}
                    <span className="ml-1 text-sm font-normal text-slate-500">{copy.monthsSuffix}</span>
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    {copy.planRegionPrefix} {regional.continent}
                  </span>
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {features.map((line) => (
                      <li key={line} className="flex gap-2 text-sm leading-snug text-slate-600">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F5BFF]" aria-hidden />
                        {line}
                      </li>
                    ))}
                  </ul>
                  {disabled ? <span className="mt-3 text-xs font-medium text-red-600">{copy.betaUsedLabel}</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        {addons.length > 0 ? (
          <section className="space-y-5">
            <SectionHeading title={copy.addonsLabel} hint={copy.addonsHint} />
            <div className="space-y-3">
              {addons.map((addon) => {
                const { isMonthly, unitPrice } = resolveAddonUnitPrice(addon);
                const price = unitPrice > 0 ? unitPrice : null;
                const suffix = isMonthly ? copy.monthsSuffix : copy.oneTimeSuffix;
                const isSelected = selectedAddons.some((a) => a.addon_id === addon.id);
                return (
                  <label
                    key={addon.id}
                    data-selected={isSelected}
                    className="onboarding-option flex cursor-pointer items-start justify-between gap-4 rounded-2xl p-4 sm:p-5"
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedAddons((prev) => {
                            if (checked) {
                              return [...prev.filter((a) => a.addon_id !== addon.id), { addon_id: addon.id, quantity: 1 }];
                            }
                            return prev.filter((a) => a.addon_id !== addon.id);
                          });
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">{addon.name ?? addon.slug}</span>
                        {addon.description ? <span className="mt-0.5 block text-sm text-slate-500">{addon.description}</span> : null}
                      </span>
                    </span>
                    {price != null ? (
                      <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {usdFmt.format(Number(price))}
                        <span className="font-normal text-slate-500">{suffix}</span>
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>
        ) : null}

        <section id="payment-method" className="scroll-mt-24 space-y-5" tabIndex={-1}>
          <SectionHeading title={copy.paymentMethodLabel} hint={copy.paymentMethodHint} />
          <div role="radiogroup" aria-label={copy.paymentMethodLabel} className="space-y-3">
            {paymentMethodOptions.map((method) => {
              const selected = subMethod === method.slug;
              const Icon = method.slug === "paypal" ? CreditCard : method.slug.includes("transfer") ? Landmark : Building2;
              return (
                <label key={method.slug} data-selected={selected} className="onboarding-option flex cursor-pointer items-center gap-4 rounded-2xl p-4 sm:p-5">
                  <input
                    type="radio"
                    name="sub_method"
                    value={method.slug}
                    checked={selected}
                    onChange={() => setSubMethod(method.slug)}
                    className="h-4 w-4 shrink-0 border-slate-300"
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{method.label}</span>
                    <span className="block text-sm text-slate-500">{method.description}</span>
                  </span>
                </label>
              );
            })}
            {planMethodsLoadState === "idle" && !country ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">{copy.selectCountryFirst}</p>
            ) : null}
            {planMethodsLoadState === "loading" ? (
              <div className="h-[74px] animate-pulse rounded-2xl bg-slate-100" aria-hidden />
            ) : null}
            {planMethodsLoadState === "ready" && paymentMethodOptions.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{copy.noMethods}</p>
            ) : null}
            {planMethodsLoadState === "error" ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
                {copy.methodsLoadError}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.25)] sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">{copy.summaryLabel}</h2>
          {cartLines.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{copy.summaryEmpty}</p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {cartLines.map((line, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-slate-600">{line.label}</span>
                    <span className="shrink-0 whitespace-nowrap font-medium text-slate-900">
                      {usdFmt.format(line.amount)}
                      {line.type === "monthly" ? copy.monthsSuffix : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {monthlyTotal > 0 ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-900">{copy.monthlyTotalLabel}</span>
                    <span className="text-xl font-semibold tracking-tight text-slate-900">
                      {usdFmt.format(monthlyTotal)}
                      <span className="text-sm font-normal text-slate-500">{copy.monthsSuffix}</span>
                    </span>
                  </div>
                ) : null}
                {oneTimeTotal > 0 ? (
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-slate-500">{copy.oneTimeLabel}</span>
                    <span className="font-semibold text-slate-900">{usdFmt.format(oneTimeTotal)}</span>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            loading={loading}
            disabled={!planId || !country || !currency || !subMethod}
            size="lg"
            className="onboarding-btn-primary mt-5 h-12 w-full rounded-xl text-[15px]"
          >
            {copy.continueButton}
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{copy.noChargeNote}</p>
        </div>
      </aside>
    </form>
  );
}
