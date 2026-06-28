import type { PublicPlanForLanding } from "@/lib/plans/public-plans";
import { resolveRegionalPlanPrice } from "@/lib/plans/plan-regional-pricing";

import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Statement } from "./statement";
import { FeatureSplit } from "./feature-split";
import { BentoGrid } from "./bento-grid";
import { Pricing } from "./pricing";
import { Faq } from "./faq";
import { Ticker } from "./ticker";
import { Footer } from "./footer";
import { FloatingSocialDock } from "./floating-social-dock";
import { getLandingSocialLinks } from "@/lib/landing/contact";

type LandingV3ShellProps = {
  plans: PublicPlanForLanding[];
  country: string;
};

function resolveFromPrice(plans: PublicPlanForLanding[], country: string) {
  const prices = plans
    .map((plan) => resolveRegionalPlanPrice(plan, country))
    .filter((p) => p.price > 0);
  if (prices.length === 0) return null;
  return prices.reduce((min, current) => (current.price < min.price ? current : min));
}

export function LandingV3Shell({ plans, country }: LandingV3ShellProps) {
  const fromPrice = resolveFromPrice(plans, country);
  const floatingSocialLinks = getLandingSocialLinks().filter(
    (link) => link.kind === "instagram" || link.kind === "whatsapp",
  );

  return (
    <div className="landing-v3 min-h-screen">
      <Navbar />
      <main>
        <Hero fromPrice={fromPrice} />
        <Statement />
        <FeatureSplit />
        <BentoGrid />
        <Pricing plans={plans} country={country} />
        <Faq />
        <Ticker />
      </main>
      <Footer />
      <FloatingSocialDock links={floatingSocialLinks} />
    </div>
  );
}
