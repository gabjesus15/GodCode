import Link from "next/link";
import { Check } from "lucide-react";

import { popularPlanIndex, type PublicPlanForLanding } from "@/lib/plans/public-plans";
import { filterPlansWithPositiveRegionalPrice, resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";

type PricingProps = {
  plans: PublicPlanForLanding[];
  country: string;
};

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  } catch {
    return `$${price.toLocaleString("en-US")}`;
  }
}

export function Pricing({ plans, country }: PricingProps) {
  const paidPlans = filterPlansWithPositiveRegionalPrice(plans, country);
  const popularIdx = popularPlanIndex(paidPlans.length);
  const gridCols = "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section id="precios" className="v3-section-dark py-28 md:py-36">
      <div className="v3-container">
        <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="v3-label mb-4">{"// "}PRECIOS</p>
            <h2 className="font-display text-5xl tracking-wide text-[#f4f4f5] md:text-6xl lg:text-7xl">
              Planes <span className="text-[#7c3aed]">simples</span>
            </h2>
          </div>
          <p className="max-w-md text-lg text-[#a1a1aa]">
            En tu primer pago: 2 meses al precio de 1. Cancelá cuando quieras. Sin comisiones por venta.
          </p>
        </div>

        {paidPlans.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-10 text-center text-[#a1a1aa]">
            Estamos actualizando nuestros planes. Escribinos y te contamos los precios al instante.
          </p>
        ) : (
          <div className={`grid grid-cols-1 gap-5 ${gridCols}`}>
            {paidPlans.map((plan, index) => {
              const isPopular = index === popularIdx;
              const { price, currency } = resolveRegionalPlanPrice(plan, country);

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-colors ${
                    isPopular
                      ? "border-[#7c3aed] bg-[#141414]"
                      : "border-[rgba(244,244,245,0.12)] bg-[#141414] hover:border-[rgba(244,244,245,0.2)]"
                  }`}
                >
                  {isPopular ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-[#7c3aed] px-3 py-1 text-xs font-semibold text-white">
                      Popular
                    </span>
                  ) : null}
                  <div className="mb-6">
                    <p className="font-display text-2xl text-[#f4f4f5]">
                      {plan.name}
                    </p>
                    <p className="mt-2 font-display text-4xl text-[#f4f4f5]">
                      {formatPrice(price, currency)}
                      <span className="text-lg text-[#71717a]">/mes</span>
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[#71717a]">
                      {currency}
                    </p>
                  </div>
                  <ul className="mb-8 flex flex-col gap-3">
                    {plan.featureBullets.map((feature, fi) => (
                      <li
                        key={`${plan.id}-${fi}`}
                        className="flex items-start gap-3 text-sm text-[#a1a1aa]"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7c3aed]" />
                        <span className="whitespace-pre-wrap">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/onboarding"
                    className={`mt-auto inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                      isPopular
                        ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                        : "border border-[rgba(244,244,245,0.2)] text-[#f4f4f5] hover:border-[#7c3aed] hover:text-white"
                    }`}
                  >
                    Empezar
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-[#71717a]">
          Garantía: si no te sirve, cancelás sin penalidad.
        </p>
      </div>
    </section>
  );
}
