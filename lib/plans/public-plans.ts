import "server-only";

import { unstable_cache } from "next/cache";

import type { AppLocale } from "@/lib/i18n/config";

import { resolvePlanMarketingLines, resolvePlanName } from "./plan-i18n";
import { queryPublicPlansLandingRows } from "./plans-db-query";

export type PublicPlanForLanding = {
  id: string;
  name: string;
  pricesByContinent: Record<string, { price: number; currency: string }>;
  max_branches: number;
  max_users: number;
  featureBullets: string[];
};

function bulletsFromPlan(row: {
  max_branches: number | null;
  max_users: number | null;
  marketing_lines?: unknown;
  marketing_lines_i18n?: unknown;
}, locale: AppLocale): string[] {
  const custom = resolvePlanMarketingLines({
    locale,
    marketingLines: row.marketing_lines,
    marketingLinesI18n: row.marketing_lines_i18n,
  });
  const base: string[] = [];
  const maxB = row.max_branches ?? 0;
  const maxU = row.max_users ?? 0;

  const suffixByLocale: Record<AppLocale, {
    empty: string;
    branches: (n: number) => string;
    users: (n: number) => string;
  }> = {
    es: {
      empty: "Detalles del plan configurables desde el panel",
      branches: (n) => `Hasta ${n} sucursal${n === 1 ? "" : "es"}`,
      users: (n) => `Hasta ${n} usuario${n === 1 ? "" : "s"}`,
    },
    en: {
      empty: "Plan details configurable from the admin panel",
      branches: (n) => `Up to ${n} branch${n === 1 ? "" : "es"}`,
      users: (n) => `Up to ${n} user${n === 1 ? "" : "s"}`,
    },
    pt: {
      empty: "Detalhes do plano configuraveis no painel",
      branches: (n) => `Ate ${n} filial${n === 1 ? "" : "is"}`,
      users: (n) => `Ate ${n} usuario${n === 1 ? "" : "s"}`,
    },
    fr: {
      empty: "Details du plan configurables depuis le panneau",
      branches: (n) => `Jusqu'a ${n} succursale${n === 1 ? "" : "s"}`,
      users: (n) => `Jusqu'a ${n} utilisateur${n === 1 ? "" : "s"}`,
    },
    de: {
      empty: "Plangetails sind im Admin-Panel konfigurierbar",
      branches: (n) => `Bis zu ${n} Filiale${n === 1 ? "" : "n"}`,
      users: (n) => `Bis zu ${n} Benutzer${n === 1 ? "" : "n"}`,
    },
    it: {
      empty: "Dettagli del piano configurabili dal pannello",
      branches: (n) => `Fino a ${n} filiale${n === 1 ? "" : "i"}`,
      users: (n) => `Fino a ${n} utente${n === 1 ? "" : "i"}`,
    },
  };

  const copy = suffixByLocale[locale] ?? suffixByLocale.es;
  if (maxB > 0) {
    base.push(copy.branches(maxB));
  }
  if (maxU > 0) {
    base.push(copy.users(maxU));
  }

  const merged = [...base, ...custom];
  if (merged.length === 0) {
    return [copy.empty];
  }
  return merged;
}

/**
 * Planes visibles en la landing: `is_public` y activos (`is_active` no es false).
 * Si se especifica un país, intenta filtrar por un tag específico del país.
 * Orden por precio ascendente (como en el panel de planes).
 */
async function loadPublicPlansForLanding(locale: AppLocale): Promise<PublicPlanForLanding[]> {
  const { data, error } = await queryPublicPlansLandingRows();

  if (error) {
    console.error("[getPublicPlansForLanding]", error.message);
    return [];
  }

  const rows = (data ?? []).filter((p) => p.is_active !== false);

  return rows.map((p) => ({
    id: p.id,
    name: resolvePlanName({ locale, name: p.name, nameI18n: p.name_i18n }),
    pricesByContinent:
      p.prices_by_continent && typeof p.prices_by_continent === "object"
        ? (p.prices_by_continent as Record<string, { price: number; currency: string }>)
        : {
            "Latinoamérica": {
              price: Number(p.price ?? 0),
              currency: "USD",
            },
          },
    max_branches: p.max_branches ?? 0,
    max_users: p.max_users ?? 0,
    featureBullets: bulletsFromPlan(p, locale),
  }));
}

const getPublicPlansForLandingCached = unstable_cache(
  loadPublicPlansForLanding,
  ["public-plans-landing-v1"],
  { revalidate: 120, tags: ["tag:plans"] },
);

export async function getPublicPlansForLanding(locale: AppLocale): Promise<PublicPlanForLanding[]> {
  return getPublicPlansForLandingCached(locale);
}

/** Índice del plan destacado estilo “Popular” (centro de la lista). */
export function popularPlanIndex(count: number): number {
  if (count <= 1) return 0;
  return Math.floor(count / 2);
}
