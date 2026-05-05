/**
 * Replace root lib/* shim import paths with canonical @/lib/<domain>/... paths.
 * Run: node scripts/migrate-lib-shim-imports.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
]);

/** Shim path segment after lib/ → canonical @/lib/... */
const MAP = {
  "supabase-admin": "@/lib/infra/supabase-admin",
  logger: "@/lib/infra/logger",
  env: "@/lib/infra/env",
  "feature-flags": "@/lib/infra/feature-flags",
  "rate-limiter": "@/lib/infra/rate-limiter",
  "server-sanitize": "@/lib/infra/server-sanitize",
  "api-cors": "@/lib/infra/api-cors",
  "admin-audit": "@/lib/super-admin/admin-audit",
  "admin-audit-row": "@/lib/super-admin/admin-audit-row",
  "account-access": "@/lib/super-admin/account-access",
  "company-panel-access": "@/lib/super-admin/company-panel-access",
  "super-admin-dashboard-shared": "@/lib/super-admin/super-admin-dashboard-shared",
  "super-admin-metrics": "@/lib/super-admin/super-admin-metrics",
  "super-admin-nav": "@/lib/super-admin/super-admin-nav",
  "tenant-admin-tabs": "@/lib/super-admin/tenant-admin-tabs",
  "checkout-copy": "@/lib/plans/checkout-copy",
  "onboarding-payment-copy": "@/lib/plans/onboarding-payment-copy",
  "plan-features": "@/lib/plans/plan-features",
  "plan-i18n": "@/lib/plans/plan-i18n",
  "plan-marketing-lines": "@/lib/plans/plan-marketing-lines",
  "plan-offer-rules": "@/lib/plans/plan-offer-rules",
  "plan-regional-pricing": "@/lib/plans/plan-regional-pricing",
  "plans-db-query": "@/lib/plans/plans-db-query",
  "public-plans": "@/lib/plans/public-plans",
  "tenant-plan-features": "@/lib/plans/tenant-plan-features",
  "tenant-subscription": "@/lib/plans/tenant-subscription",
  "address-search-query": "@/lib/delivery/address-search-query",
  "delivery-area-resolve": "@/lib/delivery/delivery-area-resolve",
  "delivery-public-limiter": "@/lib/delivery/delivery-public-limiter",
  "delivery-quote-contract": "@/lib/delivery/delivery-quote-contract",
  "delivery-settings": "@/lib/delivery/delivery-settings",
  "openstreet-geocoding": "@/lib/delivery/openstreet-geocoding",
  "tenant-delivery-settings": "@/lib/delivery/tenant-delivery-settings",
  "uber-direct": "@/lib/delivery/uber-direct",
  "chile-regions": "@/lib/geo/chile-regions",
  "country-forms": "@/lib/geo/country-forms",
  "country-registry": "@/lib/geo/country-registry",
  geo: "@/lib/geo/geo",
  "landing-geo-plans": "@/lib/geo/landing-geo-plans",
  "company-integration-json": "@/lib/integrations/company-integration-json",
  "company-integration-policy": "@/lib/integrations/company-integration-policy",
  "company-integration-settings": "@/lib/integrations/company-integration-settings",
  "integration-secrets": "@/lib/integrations/integration-secrets",
  "landing-webhook": "@/lib/integrations/landing-webhook",
  "landing-form-utils": "@/lib/landing/landing-form-utils",
  "landing-media": "@/lib/landing/landing-media",
  "landing-media-types": "@/lib/landing/landing-media-types",
  "onboarding-bff-proxy": "@/lib/onboarding/onboarding-bff-proxy",
  "service-proxy": "@/lib/onboarding/service-proxy",
  "store-theme-utils": "@/lib/store-theme/store-theme-utils",
  "customer-account-context": "@/lib/tenant/customer-account-context",
  "app-url": "@/lib/tenant/app-url",
  "custom-domain-resolve": "@/lib/tenant/custom-domain-resolve",
  "main-domain-host": "@/lib/tenant/main-domain-host",
  "tenant-effective-custom-domain": "@/lib/tenant/tenant-effective-custom-domain",
};

const IMPORT_RE = new RegExp(
  String.raw`(from\s+["']|import\s*\(\s*["'])(?:(?:\.\./)+|@/)lib/([^"'/]+)(["'])`,
  "g",
);

function migrateContent(text) {
  return text.replace(IMPORT_RE, (full, prefix, shimName, endQ) => {
    const canonical = MAP[shimName];
    if (!canonical) return full;
    return `${prefix}${canonical}${endQ}`;
  });
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx|mts|js|mjs)$/.test(e.name)) {
      out.push(p);
    }
  }
}

const files = [];
walk(ROOT, files);

let changed = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith("uploads" + path.sep)) continue;
  const before = fs.readFileSync(file, "utf8");
  const after = migrateContent(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed++;
    console.log("updated:", rel);
  }
}
console.log("files changed:", changed);
