import { normalizeMarketingLines } from "./plan-marketing-lines";

type GenericObject = Record<string, unknown>;

export type PlanOfferSnapshot = {
  id: string;
  name: string;
  max_branches: number | null;
  max_users: number | null;
  features?: unknown;
  marketing_lines?: unknown;
};

export type AddonOfferSnapshot = {
  id: string;
  slug: string | null;
  name: string;
  type?: string | null;
  description?: string | null;
};

export type AddonOfferStatus = "available" | "included" | "blocked";

export type AddonOfferDecision = {
  status: AddonOfferStatus;
  reason: string;
  matchedBy: "feature_policy" | "heuristic" | "default";
};

function normalizeToken(input: string | null | undefined): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toObject(input: unknown): GenericObject {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as GenericObject;
}

function toStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    const token = normalizeToken(typeof item === "string" ? item : String(item ?? ""));
    if (token) out.push(token);
  }
  return out;
}

function getFeatureValue(features: GenericObject, keys: string[]): unknown {
  const normalized = new Set(keys.map((key) => normalizeToken(key)).filter(Boolean));
  for (const [key, value] of Object.entries(features)) {
    if (normalized.has(normalizeToken(key))) {
      return value;
    }
  }
  return undefined;
}

function getFeatureStringList(features: GenericObject, keys: string[]): string[] {
  const value = getFeatureValue(features, keys);
  return toStringList(value);
}

function hasFeatureTruthy(features: GenericObject, keys: string[]): boolean {
  const value = getFeatureValue(features, keys);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const token = normalizeToken(value);
    return token === "true" || token === "yes" || token === "si" || token === "enabled";
  }
  return false;
}

function normalizeAddonMatcher(addon: AddonOfferSnapshot): Set<string> {
  const tokens = new Set<string>();
  const source = [addon.id, addon.slug, addon.name, addon.type, addon.description];
  for (const item of source) {
    const token = normalizeToken(item);
    if (token) tokens.add(token);
  }

  const slug = normalizeToken(addon.slug);
  if (slug === "custom_domain") {
    tokens.add("dominio_propio");
    tokens.add("custom_domain");
    tokens.add("domain");
  }
  if (slug === "branding") {
    tokens.add("personalizacion");
    tokens.add("custom_branding");
    tokens.add("menu_customization");
  }

  return tokens;
}

function matchesTokenSet(matchers: Set<string>, values: Set<string>): boolean {
  for (const matcher of matchers) {
    if (values.has(matcher)) return true;
  }
  return false;
}

function inferCapabilities(plan: PlanOfferSnapshot): Set<string> {
  const features = toObject(plan.features);
  const caps = new Set<string>();

  if (
    hasFeatureTruthy(features, [
      "branding",
      "custom_branding",
      "menu_branding",
      "menu_customization",
      "personalizacion_menu",
      "customization",
    ])
  ) {
    caps.add("branding_included");
  }

  if (hasFeatureTruthy(features, ["custom_domain", "dominio_propio", "domain", "custom-domain"])) {
    caps.add("custom_domain_included");
  }

  const lines = normalizeMarketingLines(plan.marketing_lines).map((line) => normalizeToken(line));
  for (const line of lines) {
    if (line.includes("personalizacion") || line.includes("plantilla_personalizada") || line.includes("customization")) {
      caps.add("branding_included");
    }
    if (line.includes("dominio_propio") || line.includes("custom_domain")) {
      caps.add("custom_domain_included");
    }
  }

  return caps;
}

export function resolveAddonOfferForPlan(plan: PlanOfferSnapshot | null, addon: AddonOfferSnapshot): AddonOfferDecision {
  if (!plan) {
    return {
      status: "available",
      reason: "No se encontro plan activo para validar reglas de extras.",
      matchedBy: "default",
    };
  }

  const features = toObject(plan.features);
  const included = new Set(
    getFeatureStringList(features, ["included_addons", "addons_included", "includes_addons", "plan_addons_included"])
  );
  const blocked = new Set(
    getFeatureStringList(features, ["blocked_addons", "addons_blocked", "excluded_addons", "plan_addons_blocked"])
  );

  const allowedList = getFeatureStringList(features, ["allowed_addons", "addons_allowed", "plan_addons_allowed"]);
  const allowed = allowedList.length > 0 ? new Set(allowedList) : null;

  const matcher = normalizeAddonMatcher(addon);

  if (matchesTokenSet(matcher, blocked)) {
    return {
      status: "blocked",
      reason: `El plan ${plan.name} bloquea este extra por politica de producto.`,
      matchedBy: "feature_policy",
    };
  }

  if (allowed && !matchesTokenSet(matcher, allowed)) {
    return {
      status: "blocked",
      reason: `El plan ${plan.name} no permite este extra segun la oferta configurada.`,
      matchedBy: "feature_policy",
    };
  }

  if (matchesTokenSet(matcher, included)) {
    return {
      status: "included",
      reason: `Este extra ya viene incluido en el plan ${plan.name}.`,
      matchedBy: "feature_policy",
    };
  }

  const caps = inferCapabilities(plan);
  const addonSlug = normalizeToken(addon.slug);

  if (addonSlug === "branding" && caps.has("branding_included")) {
    return {
      status: "included",
      reason: `Este plan ya incluye personalizacion/branding.`,
      matchedBy: "heuristic",
    };
  }

  if (addonSlug === "custom_domain" && caps.has("custom_domain_included")) {
    return {
      status: "included",
      reason: `Este plan ya incluye dominio propio.`,
      matchedBy: "heuristic",
    };
  }

  return {
    status: "available",
    reason: `Disponible para contratar en el plan ${plan.name}.`,
    matchedBy: "default",
  };
}
