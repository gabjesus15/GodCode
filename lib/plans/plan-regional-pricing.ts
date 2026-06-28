import { Continent, getCountryConfig } from "../geo/country-registry";

type PlanPricingMap = Record<string, { price: number; currency: string }>;

export function resolveContinentFromCountryInput(country: string | null | undefined): Continent {
  const config = getCountryConfig(country);
  return config ? config.continent : "Latinoamérica";
}

export function resolveRegionalPlanPrice(plan: {
  price?: number | null;
  pricesByContinent?: PlanPricingMap | null;
  prices_by_continent?: PlanPricingMap | null;
}, country: string | null | undefined): {
  continent: Continent;
  price: number;
  currency: string;
  source: "regional" | "fallback";
} {
  const continent = resolveContinentFromCountryInput(country);
  const priceMap = plan.pricesByContinent ?? plan.prices_by_continent ?? {};
  const regional = priceMap[continent] ?? priceMap["Latinoamérica"] ?? Object.values(priceMap)[0] ?? null;
  if (regional && typeof regional.price === "number") {
    return {
      continent,
      price: Number(regional.price ?? 0),
      currency: String(regional.currency ?? "USD").toUpperCase(),
      source: "regional",
    };
  }
  return {
    continent,
    price: Number(plan.price ?? 0),
    currency: "USD",
    source: "fallback",
  };
}

export function filterPlansWithPositiveRegionalPrice<T extends {
  price?: number | null;
  pricesByContinent?: PlanPricingMap | null;
  prices_by_continent?: PlanPricingMap | null;
}>(plans: T[], country: string | null | undefined): T[] {
  return plans.filter((plan) => resolveRegionalPlanPrice(plan, country).price > 0);
}
