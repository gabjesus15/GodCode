import { DEFAULT_LOCALE, normalizeLocale, SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";

import { normalizeMarketingLines } from "./plan-marketing-lines";

type LocaleRecord = Record<AppLocale, string>;
type LocaleLinesRecord = Record<AppLocale, string[]>;

function asObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function normalizePlanNameI18n(raw: unknown): Partial<LocaleRecord> {
  const obj = asObject(raw);
  if (!obj) return {};

  const out: Partial<LocaleRecord> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const value = String(obj[locale] ?? "").trim();
    if (value) out[locale] = value;
  }
  return out;
}

export function normalizePlanMarketingLinesI18n(raw: unknown): Partial<LocaleLinesRecord> {
  const obj = asObject(raw);
  if (!obj) return {};

  const out: Partial<LocaleLinesRecord> = {};
  for (const locale of SUPPORTED_LOCALES) {
    out[locale] = normalizeMarketingLines(obj[locale]);
  }
  return out;
}

export function buildPlanNameI18nPayload(raw: unknown, fallbackName: unknown): LocaleRecord {
  const normalized = normalizePlanNameI18n(raw);
  const fallback = String(fallbackName ?? "").trim() || "Plan";
  const out = {} as LocaleRecord;

  for (const locale of SUPPORTED_LOCALES) {
    out[locale] = normalized[locale] ?? normalized.es ?? normalized.en ?? fallback;
  }

  return out;
}

export function buildPlanMarketingLinesI18nPayload(raw: unknown, fallbackLines: unknown): LocaleLinesRecord {
  const normalized = normalizePlanMarketingLinesI18n(raw);
  const fallback = normalizeMarketingLines(fallbackLines);
  const out = {} as LocaleLinesRecord;

  for (const locale of SUPPORTED_LOCALES) {
    out[locale] = normalized[locale] ?? normalized.es ?? normalized.en ?? fallback;
  }

  return out;
}

export function resolvePlanName(params: {
  locale: unknown;
  name: unknown;
  nameI18n?: unknown;
}): string {
  const locale = normalizeLocale(params.locale);
  const map = normalizePlanNameI18n(params.nameI18n);
  const fallback = String(params.name ?? "").trim() || "Plan";
  return map[locale] ?? map.es ?? map.en ?? fallback;
}

export function resolvePlanMarketingLines(params: {
  locale: unknown;
  marketingLines?: unknown;
  marketingLinesI18n?: unknown;
}): string[] {
  const locale = normalizeLocale(params.locale);
  const map = normalizePlanMarketingLinesI18n(params.marketingLinesI18n);
  const fallback = normalizeMarketingLines(params.marketingLines);
  return map[locale] ?? map.es ?? map.en ?? fallback;
}

export function createLocalizedPlanNameState(params: {
  fallbackName: unknown;
  nameI18n?: unknown;
}): LocaleRecord {
  return buildPlanNameI18nPayload(params.nameI18n, params.fallbackName);
}

export function createLocalizedPlanMarketingLinesState(params: {
  fallbackLines?: unknown;
  marketingLinesI18n?: unknown;
}): LocaleLinesRecord {
  return buildPlanMarketingLinesI18nPayload(params.marketingLinesI18n, params.fallbackLines);
}

export { DEFAULT_LOCALE };
