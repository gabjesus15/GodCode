"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resolveRegionalPlanPrice, resolveContinentFromCountryInput } from "@/lib/plans/plan-regional-pricing";

type Plan = {
  id: string;
  name: string | null;
  price: number | null;
  pricesByContinent?: Record<string, { price: number; currency: string }> | null;
  max_branches: number | null;
};

type PaymentMethodOption = {
  slug: string;
  label: string;
  description: string;
};

const INTERNAL_PLAN_NAMES = ["dev", "desarrollo", "internal", "test"];
const BETA_PLAN_NAMES = ["beta"];

function isPlanInternal(plan: Plan): boolean {
  const n = (plan.name ?? "").toLowerCase().trim();
  return INTERNAL_PLAN_NAMES.some((k) => n === k || n.startsWith(`${k} `));
}

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
type AddonChoice = { addon_id: string; quantity: number; price_snapshot: number | null };

const MANUAL_SUBSCRIPTION_SLUGS = new Set(["pago_movil", "zelle", "transferencia"]);

const STEP2_COPY = {
  es: {
    countryLabel: "País *",
    countryPlaceholder: "Selecciona tu país",
    currencyLabel: "Moneda del negocio *",
    currencyPlaceholder: "Selecciona moneda",
    planLabel: "Elige tu plan *",
    addonsLabel: "Servicios extra",
    summaryLabel: "Resumen",
    monthlyTotalLabel: "Total mensual",
    oneTimeLabel: "Pago único",
    paymentMethodLabel: "Método de pago *",
    cardTitle: "Tarjeta (Stripe)",
    cardDescription: "Débito o crédito.",
    paypalDescription: "Redirigido a PayPal.",
    manualDescription: "Instrucciones en el siguiente paso.",
    continueButton: "Ir a pagar",
    betaUsedLabel: "Ya usaste el plan beta.",
    monthsSuffix: "/mes",
    planRegionPrefix: "Precio para",
    branchesSuffixSingular: "sucursal",
    branchesSuffixPlural: "sucursales",
  },
  en: {
    countryLabel: "Country *",
    countryPlaceholder: "Select your country",
    currencyLabel: "Business currency *",
    currencyPlaceholder: "Select currency",
    planLabel: "Choose your plan *",
    addonsLabel: "Extra services",
    summaryLabel: "Summary",
    monthlyTotalLabel: "Monthly total",
    oneTimeLabel: "One-time payment",
    paymentMethodLabel: "Payment method *",
    cardTitle: "Card (Stripe)",
    cardDescription: "Debit or credit.",
    paypalDescription: "Redirected to PayPal.",
    manualDescription: "Instructions in the next step.",
    continueButton: "Go to payment",
    betaUsedLabel: "You already used the beta plan.",
    monthsSuffix: "/month",
    planRegionPrefix: "Price for",
    branchesSuffixSingular: "branch",
    branchesSuffixPlural: "branches",
  },
  pt: {
    countryLabel: "País *",
    countryPlaceholder: "Selecione seu país",
    currencyLabel: "Moeda do negócio *",
    currencyPlaceholder: "Selecione a moeda",
    planLabel: "Escolha seu plano *",
    addonsLabel: "Serviços extras",
    summaryLabel: "Resumo",
    monthlyTotalLabel: "Total mensal",
    oneTimeLabel: "Pagamento único",
    paymentMethodLabel: "Método de pagamento *",
    cardTitle: "Cartão (Stripe)",
    cardDescription: "Débito ou crédito.",
    paypalDescription: "Redirecionado para o PayPal.",
    manualDescription: "Instruções na próxima etapa.",
    continueButton: "Ir para o pagamento",
    betaUsedLabel: "Você já usou o plano beta.",
    monthsSuffix: "/mês",
    planRegionPrefix: "Preço para",
    branchesSuffixSingular: "filial",
    branchesSuffixPlural: "filiais",
  },
  fr: {
    countryLabel: "Pays *",
    countryPlaceholder: "Sélectionnez votre pays",
    currencyLabel: "Devise de l’entreprise *",
    currencyPlaceholder: "Sélectionnez la devise",
    planLabel: "Choisissez votre offre *",
    addonsLabel: "Services supplémentaires",
    summaryLabel: "Résumé",
    monthlyTotalLabel: "Total mensuel",
    oneTimeLabel: "Paiement unique",
    paymentMethodLabel: "Moyen de paiement *",
    cardTitle: "Carte (Stripe)",
    cardDescription: "Débit ou crédit.",
    paypalDescription: "Redirigé vers PayPal.",
    manualDescription: "Instructions à l’étape suivante.",
    continueButton: "Aller au paiement",
    betaUsedLabel: "Vous avez déjà utilisé l’offre bêta.",
    monthsSuffix: "/mois",
    planRegionPrefix: "Prix pour",
    branchesSuffixSingular: "succursale",
    branchesSuffixPlural: "succursales",
  },
  de: {
    countryLabel: "Land *",
    countryPlaceholder: "Land auswählen",
    currencyLabel: "Währung des Unternehmens *",
    currencyPlaceholder: "Währung auswählen",
    planLabel: "Wählen Sie Ihren Plan *",
    addonsLabel: "Zusatzleistungen",
    summaryLabel: "Zusammenfassung",
    monthlyTotalLabel: "Monatliche Gesamtsumme",
    oneTimeLabel: "Einmalige Zahlung",
    paymentMethodLabel: "Zahlungsmethode *",
    cardTitle: "Karte (Stripe)",
    cardDescription: "Debit oder Kredit.",
    paypalDescription: "Weiterleitung zu PayPal.",
    manualDescription: "Anweisungen im nächsten Schritt.",
    continueButton: "Zur Zahlung",
    betaUsedLabel: "Sie haben den Beta-Plan bereits genutzt.",
    monthsSuffix: "/Monat",
    planRegionPrefix: "Preis für",
    branchesSuffixSingular: "Filiale",
    branchesSuffixPlural: "Filialen",
  },
  it: {
    countryLabel: "Paese *",
    countryPlaceholder: "Seleziona il tuo paese",
    currencyLabel: "Valuta dell’attività *",
    currencyPlaceholder: "Seleziona la valuta",
    planLabel: "Scegli il tuo piano *",
    addonsLabel: "Servizi extra",
    summaryLabel: "Riepilogo",
    monthlyTotalLabel: "Totale mensile",
    oneTimeLabel: "Pagamento unico",
    paymentMethodLabel: "Metodo di pagamento *",
    cardTitle: "Carta (Stripe)",
    cardDescription: "Debito o credito.",
    paypalDescription: "Reindirizzato a PayPal.",
    manualDescription: "Istruzioni nel passaggio successivo.",
    continueButton: "Vai al pagamento",
    betaUsedLabel: "Hai già usato il piano beta.",
    monthsSuffix: "/mese",
    planRegionPrefix: "Prezzo per",
    branchesSuffixSingular: "filiale",
    branchesSuffixPlural: "filiali",
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
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "paypal") return "paypal";
  if (MANUAL_SUBSCRIPTION_SLUGS.has(t)) return t;
  return "stripe";
}

const usdFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
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
  { value: "COP", label: "Peso Colombiano (COP)" },
  { value: "ARS", label: "Peso Argentino (ARS)" },
  { value: "CLP", label: "Peso Chileno (CLP)" },
  { value: "MXN", label: "Peso Mexicano (MXN)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "Otro", label: "Otro" },
] as const;

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
  const [planMethodsLoadState, setPlanMethodsLoadState] = useState<"idle" | "loading" | "ready">("idle");

  const [selectedAddons, setSelectedAddons] = useState<AddonChoice[]>(() => {
    const fromInitial = initialData.addons ?? [];
    return fromInitial.map((a) => ({
      addon_id: a.addon_id,
      quantity: Math.max(1, Number(a.quantity) || 1),
      price_snapshot: a.price_snapshot != null ? Number(a.price_snapshot) : null,
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
        if (!cancelled && Array.isArray(json.data)) setPlanPaymentMethods(json.data);
      })
      .catch(() => { if (!cancelled) setPlanPaymentMethods([]); })
      .finally(() => { if (!cancelled) setPlanMethodsLoadState("ready"); });
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
      if (slug === "stripe") {
        return {
          slug,
          label: copy.cardTitle,
          description: copy.cardDescription,
        };
      }
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
  }, [copy.cardDescription, copy.cardTitle, copy.manualDescription, copy.paypalDescription, planPaymentMethods]);
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
      const price = addon.type === "monthly" ? addon.price_monthly : addon.price_one_time;
      lines.push({
        label: addon.name ?? addon.slug,
        amount: Number(price ?? 0),
        type: addon.type === "monthly" ? "monthly" : "one_time",
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
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      window.location.href = `/onboarding/pago?token=${encodeURIComponent(token)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const visiblePlans = plans.filter((p) => !isPlanInternal(p));

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">

      {/* Country + Currency */}
      <div className="onboarding-card grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          {copy.countryLabel}
          <select
            className="onboarding-input h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          >
            <option value="">{copy.countryPlaceholder}</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          {copy.currencyLabel}
          <select
            className="onboarding-input h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
          >
            <option value="">{copy.currencyPlaceholder}</option>
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
      </div>

      {/* Plans */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{copy.planLabel}</h3>
        <div className={`grid gap-3 ${visiblePlans.length >= 3 ? "sm:grid-cols-3" : visiblePlans.length === 2 ? "sm:grid-cols-2" : ""}`}>
          {visiblePlans.map((plan) => {
            const isBeta = isPlanBeta(plan);
            const selected = planId === plan.id;
            const disabled = isBeta && betaDisabled;
            return (
              <button
                key={plan.id}
                type="button"
                disabled={disabled}
                onClick={() => setPlanId(plan.id)}
                className={`relative flex flex-col rounded-2xl border-2 p-5 text-left transition sm:p-6 ${
                  selected
                    ? "border-indigo-500 bg-indigo-50/40 shadow-md shadow-indigo-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                {selected && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <span className="text-sm font-bold text-slate-900">{plan.name ?? "Plan"}</span>
                <span className="mt-1 text-2xl font-bold text-slate-900">
                  {usdFmt.format(Number(resolveRegionalPlanPrice(plan, country).price))}
                  <span className="text-sm font-normal text-slate-400">{copy.monthsSuffix}</span>
                </span>
                <span className="text-xs text-slate-400">
                  {copy.planRegionPrefix} {resolveRegionalPlanPrice(plan, country).continent}
                </span>
                <span className="text-xs text-slate-400">
                  Hasta {isBeta ? 2 : plan.max_branches ?? 1} {((isBeta ? 2 : Number(plan.max_branches ?? 1)) > 1) ? copy.branchesSuffixPlural : copy.branchesSuffixSingular}
                </span>
                {isBeta && betaDisabled && (
                  <span className="mt-2 text-xs text-red-500">{copy.betaUsedLabel}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Addons */}
      {addons.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{copy.addonsLabel}</h3>
          <div className="space-y-2">
            {addons.map((addon) => {
              const price = addon.type === "monthly" ? addon.price_monthly : addon.price_one_time;
              const suffix = addon.type === "monthly" ? copy.monthsSuffix : " único";
              const isSelected = selectedAddons.some((a) => a.addon_id === addon.id);
              return (
                <label
                  key={addon.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${
                    isSelected ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedAddons((prev) => {
                          if (checked) {
                            const snap = addon.type === "monthly"
                              ? addon.price_monthly != null ? Number(addon.price_monthly) : null
                              : addon.price_one_time != null ? Number(addon.price_one_time) : null;
                            return [...prev.filter((a) => a.addon_id !== addon.id), { addon_id: addon.id, quantity: 1, price_snapshot: snap }];
                          }
                          return prev.filter((a) => a.addon_id !== addon.id);
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">{addon.name ?? addon.slug}</span>
                      {addon.description && <p className="text-xs text-slate-400">{addon.description}</p>}
                    </div>
                  </div>
                  {price != null && (
                    <span className="shrink-0 text-sm font-semibold text-slate-700">
                      {usdFmt.format(Number(price))}{suffix}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Cart summary */}
      {cartLines.length > 0 && (
        <div className="onboarding-card p-5 sm:p-7">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">{copy.summaryLabel}</h3>
          <div className="space-y-2">
            {cartLines.map((line, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{line.label}</span>
                <span className="font-medium text-slate-900">
                  {usdFmt.format(line.amount)}{line.type === "monthly" ? copy.monthsSuffix : ""}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            {monthlyTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{copy.monthlyTotalLabel}</span>
                <span className="text-lg font-bold text-slate-900">{usdFmt.format(monthlyTotal)}{copy.monthsSuffix}</span>
              </div>
            )}
            {oneTimeTotal > 0 && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-slate-500">{copy.oneTimeLabel}</span>
                <span className="text-sm font-semibold text-slate-700">{usdFmt.format(oneTimeTotal)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment method */}
      <div id="payment-method" className="scroll-mt-24" tabIndex={-1}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{copy.paymentMethodLabel}</h3>
        <div className="space-y-2">
          {paymentMethodOptions.map((method) => (
            <label
              key={method.slug}
              className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <input
                type="radio"
                name="sub_method"
                value={method.slug}
                checked={subMethod === method.slug}
                onChange={() => setSubMethod(method.slug)}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-900">{method.label}</span>
                <p className="text-xs text-slate-400">{method.description}</p>
              </div>
            </label>
          ))}
          {planMethodsLoadState === "ready" && paymentMethodOptions.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              No hay metodos de pago activos para este pais. Contacta al administrador.
            </p>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <Button
        type="submit"
        loading={loading}
        disabled={!planId || !country || !currency || !subMethod}
        size="lg"
        className="onboarding-btn-primary w-full rounded-xl py-5 text-sm font-semibold sm:text-base"
      >
        {copy.continueButton}
      </Button>
    </form>
  );
}
