import { formatLandingPrice } from "@/lib/landing/price";
import type { PublicPlanForLanding } from "@/lib/plans/public-plans";
import { filterPlansWithPositiveRegionalPrice, resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";
import { groupPlanVariants, recommendedGroupIndex } from "@/lib/plans/plan-variants";
import { cn } from "@/utils/cn";
import { PlanCard } from "./plan-card";
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

export function Pricing({ plans, country }: PricingProps) {
  const paidPlans = filterPlansWithPositiveRegionalPrice(plans, country);
  // Las variantes de un mismo plan (Básico con solo menú o solo panel) van en una tarjeta con selector.
  const groups = groupPlanVariants(paidPlans);
  // «Recomendado» va al plan que marcó el dueño; sin ninguno marcado, a la tarjeta del medio.
  const popularIdx = recommendedGroupIndex(groups);

  return (
    <section id="precios" className="v3-section-dark py-24 md:py-32">
      <SectionGlow
        className="left-1/2 top-[34%] h-[620px] w-[min(1200px,160vw)] -translate-x-1/2"
        intensity={0.11}
      />
      <div className="v3-container">
        <div data-reveal className="mb-14 md:mb-16">
          <h2 className="font-display text-5xl leading-[0.95] text-[#f4f4f5] md:text-6xl">Planes</h2>
          <p className="mt-5 text-lg text-[#a1a1aa]">
            Eliges tu plan cuando publicas tu tienda: un monto fijo al mes, no un porcentaje de tus ventas. En tu primer pago, 2 meses al precio de 1.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(244,244,245,0.12)] bg-[#141414] p-10 text-center text-[#a1a1aa]">
            Estamos actualizando nuestros planes. Escríbenos y te contamos los precios al instante.
          </p>
        ) : (
          <>
          {/* Móvil: carrusel con imán; desde md, rejilla. */}
          <div
            className={cn(
              "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 pt-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:gap-5 md:overflow-visible md:p-0 [&::-webkit-scrollbar]:hidden",
              gridColsFor(groups.length),
            )}
          >
            {groups.map((group, index) => (
              <PlanCard
                key={group.key}
                name={group.name}
                isPopular={index === popularIdx}
                variants={group.variants.map(({ plan, label }) => {
                  // El precio se formatea aquí, en el servidor, para que la tarjeta pinte igual al hidratar.
                  const { price, currency } = resolveRegionalPlanPrice(plan, country);
                  return {
                    id: plan.id,
                    name: plan.name,
                    label,
                    price: formatLandingPrice(price, currency),
                    currency,
                    bullets: plan.featureBullets,
                  };
                })}
              />
            ))}
          </div>
          </>
        )}
      </div>
    </section>
  );
}
