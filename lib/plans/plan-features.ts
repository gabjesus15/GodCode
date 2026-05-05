export type PlanFeaturesPayload = Record<string, unknown>;

const INCLUDED_ALIASES = ["included_addons", "addons_included", "includes_addons", "plan_addons_included"];
const BLOCKED_ALIASES = ["blocked_addons", "addons_blocked", "excluded_addons", "plan_addons_blocked"];
const ALLOWED_ALIASES = ["allowed_addons", "addons_allowed", "plan_addons_allowed"];

function normalizeToken(input: string | null | undefined): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const set = new Set<string>();
    for (const item of raw) {
      const token = normalizeToken(typeof item === "string" ? item : String(item ?? ""));
      if (token) set.add(token);
    }
    return [...set];
  }

  if (typeof raw === "string") {
    const parts = raw
      .split(/[\n,;|]/g)
      .map((part) => normalizeToken(part))
      .filter(Boolean);
    return [...new Set(parts)];
  }

  return [];
}

function getFirstArray(features: Record<string, unknown>, aliases: string[]): string[] {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(features, alias)) {
      return toStringArray(features[alias]);
    }
  }
  return [];
}

export function normalizePlanFeaturesPayload(raw: unknown): PlanFeaturesPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const safeSource = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...safeSource };

  const included = getFirstArray(safeSource, INCLUDED_ALIASES);
  const blocked = getFirstArray(safeSource, BLOCKED_ALIASES);
  const allowed = getFirstArray(safeSource, ALLOWED_ALIASES);

  for (const key of [...INCLUDED_ALIASES, ...BLOCKED_ALIASES, ...ALLOWED_ALIASES]) {
    delete next[key];
  }

  if (included.length > 0) next.included_addons = included;
  if (blocked.length > 0) next.blocked_addons = blocked;
  if (allowed.length > 0) next.allowed_addons = allowed;

  return next;
}
