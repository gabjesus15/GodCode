import type { PublicPlanForLanding } from "@/lib/plans/public-plans";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import type { LandingSocialLink } from "@/lib/landing/contact";
import type { LandingV3Config } from "@/lib/landing/v3-config";

import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Statement } from "./statement";
import { FeatureSplit } from "./feature-split";
import { BentoGrid } from "./bento-grid";
import { Pricing } from "./pricing";
import { Faq } from "./faq";
import { Ticker } from "./ticker";
import { HowItWorks } from "./how-it-works";
import { DemoVideos } from "./demo-videos";
import { Trust } from "./trust";
import { LandingConversionTracker } from "./landing-conversion-tracker";
import { Footer } from "./footer";
import { FloatingSocialDock } from "./floating-social-dock";

type LandingV3ShellProps = {
  plans: PublicPlanForLanding[];
  country: string;
  v3Config: LandingV3Config;
  socialLinks: LandingSocialLink[];
};

export function LandingV3Shell({ plans, country, v3Config, socialLinks }: LandingV3ShellProps) {
  const fromPrice = resolveLowestPlanPrice(plans, country);
  const floatingSocialLinks = socialLinks.filter(
    (link) => link.kind === "instagram" || link.kind === "whatsapp",
  );

  return (
    <div className="landing-v3 min-h-screen">
      <Navbar />
      <main>
        <Hero fromPrice={fromPrice} heroPhones={v3Config.heroPhones} />
        <Statement />
        <HowItWorks />
        <DemoVideos demoMenuUrl={process.env.NEXT_PUBLIC_DEMO_MENU_URL?.trim() || null} />
        <FeatureSplit featureImages={v3Config.featureImages} />
        <BentoGrid bentoMenuMobile={v3Config.bentoMenuMobile} />
        <Trust socialLinks={socialLinks} />
        <Pricing plans={plans} country={country} />
        <Faq />
        <Ticker socialLinks={socialLinks} />
      </main>
      <Footer socialLinks={socialLinks} />
      <FloatingSocialDock links={floatingSocialLinks} />
      <LandingConversionTracker />
    </div>
  );
}
