import Link from "next/link";
import { Check } from "lucide-react";

import { formatLandingPrice } from "@/lib/landing/price";
import { popularPlanIndex, type PublicPlanForLanding } from "@/lib/plans/public-plans";
import { filterPlansWithPositiveRegionalPrice, resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";
import { cn } from "@/utils/cn";
import { SectionGlow } from "./section-light";

type PricingProps = {
  plans: PublicPlanForLanding[];
  country: string;
};

/** Columnas según cuántos planes hay: nunca deja una tarjeta sola en otra fila. */
function gridColsFor(count: number): string {
  if (count >= 4) return "md:grid-cols-2 xl:grid-cols-4";
  if (count === 3) return "md:grid-cols-3";
  if (count === 2) return "md:grid-cols-2 md:max-w-3xl md:mx-auto";
  return "md:max-w-md md:mx-auto md:grid-cols-1";
}

function FeatureList({ id, features }: { id: string; features: string[] }) {
  return (
    <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-white/[0.06] pt-6">
      {features.map((feature, fi) => (
        <li key={`${id}-${fi}`} className="flex items-start gap-3 text-sm leading-snug text-[#a1a1aa]">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#71717a]" aria-hidden />
          <span className="whitespace-pre-wrap">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export function Pricing({ plans, country }: PricingProps) {
  const paidPlans = filterPlansWithPositiveRegionalPrice(plans, country);
  const popularIdx = popularPlanIndex(paidPlans.length);

  return (
    <section id="precios" className="v3-section-dark py-24 md:py-32">
      <SectionGlow
        className="left-1/2 top-[34%] h-[620px] w-[min(1200px,160vw)] -translate-x-1/2"
        intensity={0.11}
      />
      <div className="v3-container">
        <div data-reveal className="mb-14 md:mb-16">
          <h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] md:text-6xl">Planes</h2>
          <p className="mt-5 text-lg text-[#a1a1aa]">Un pago mensual. En tu primer pago, 2 meses al precio de 1.</p>
        </div>

        {paidPlans.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-10 text-center text-[#a1a1aa]">
            Estamos actualizando nuestros planes. Escríbenos y te contamos los precios al instante.
          </p>
        ) : (
          <>
          {/* Móvil: carrusel con imán; desde md, rejilla. */}
          <div
            className={cn(
              "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 pt-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:gap-5 md:overflow-visible md:p-0 [&::-webkit-scrollbar]:hidden",
              gridColsFor(paidPlans.length),
            )}
          >
            {paidPlans.map((plan, index) => {
              const isPopular = index === popularIdx;
              const { price, currency } = resolveRegionalPlanPrice(plan, country);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex w-[84%] max-w-[360px] shrink-0 snap-center flex-col rounded-2xl border p-6 transition-colors duration-300 md:w-auto md:max-w-none lg:p-7",
                    isPopular
                      ? "border-[#4f5bff]/60 bg-[#13131a]"
                      : "border-white/[0.08] bg-[#111113] hover:border-white/[0.16]",
                  )}
                >
                  {isPopular ? (
                    <span className="absolute -top-2.5 left-6 rounded-full bg-[#4f5bff] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      Más elegido
                    </span>
                  ) : null}
                  <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-[#a1a1aa]">{plan.name}</h3>
                  <p className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display text-5xl leading-none text-[#f4f4f5] tabular-nums">
                      {formatLandingPrice(price, currency)}
                    </span>
                    <span className="text-sm text-[#71717a]">{currency}/mes</span>
                  </p>
                  <FeatureList id={plan.id} features={plan.featureBullets} />
                  <Link
                    href="/onboarding"
                    aria-label={`Empezar con el plan ${plan.name}`}
                    data-plan={plan.name}
                    className={cn(
                      "mt-8 inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors duration-200",
                      isPopular
                        ? "bg-[#4f5bff] text-white hover:bg-[#3d47e6]"
                        : "border border-white/15 text-[#f4f4f5] hover:border-white/35 hover:bg-white/[0.04]",
                    )}
                  >
                    Empezar
                  </Link>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </section>
  );
}
