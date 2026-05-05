/**
 * One-off helper: after moving app/api routes, update fetch/proxy strings.
 * Excluye .cursor y services/. No reemplazar /api/cron/ en proxies al micro.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const REPLACEMENTS = [
  ["/api/tenant-broadcasts", "/api/tenant/broadcasts"],
  ["/api/tenant-delivery-quote", "/api/tenant/delivery-haversine"],
  ["/api/tenant-staff", "/api/tenant/staff"],
  ["/api/tenant-tickets", "/api/tenant/tickets"],
  ["/api/public-order-delivery", "/api/tenant/public-order-delivery"],
  ["/api/address-search", "/api/geo/address-search"],
  ["/api/reverse-geocode", "/api/geo/reverse-geocode"],
  ["/api/delivery-geocode", "/api/geo/delivery-geocode"],
  ["/api/delivery-quote", "/api/geo/delivery-quote"],
  ["/api/discount-coupon-preview", "/api/geo/discount-coupon-preview"],
  ["/api/superadmin-user", "/api/auth/super-admin-user"],
  ["/api/admin-modules", "/api/super-admin/modules"],
  ["/api/admin-permissions", "/api/super-admin/permissions"],
  ["/api/roles", "/api/super-admin/roles"],
  ["/api/branches/limit-beta", "/api/super-admin/branches/limit-beta"],
  ["/api/broadcasts", "/api/super-admin/broadcasts"],
  ["/api/companies-public", "/api/public/companies"],
];

const TICKETS_SA = [
  "/api/tickets?",
  "/api/tickets/",
  '"/api/tickets"',
  "`/api/tickets`",
  "/api/tickets`",
];
const TICKETS_SA_NEW = [
  "/api/super-admin/tickets?",
  "/api/super-admin/tickets/",
  '"/api/super-admin/tickets"',
  "`/api/super-admin/tickets`",
  "/api/super-admin/tickets`",
];

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".cursor"]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx|js|mjs|md|json)$/.test(e.name)) {
      out.push(p);
    }
  }
}

function migrate(text) {
  let s = text;
  for (const [a, b] of REPLACEMENTS) {
    s = s.split(a).join(b);
  }
  for (let i = 0; i < TICKETS_SA.length; i++) {
    s = s.split(TICKETS_SA[i]).join(TICKETS_SA_NEW[i]);
  }
  s = s.replace(/fetch\("\/api\/tickets"/g, 'fetch("/api/super-admin/tickets"');
  s = s.replace(/fetch\(`\/api\/tickets\?/g, "fetch(`/api/super-admin/tickets?");
  return s;
}

const files = [];
walk(ROOT, files);

let n = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith("services" + path.sep)) continue;
  const before = fs.readFileSync(file, "utf8");
  const after = migrate(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    n++;
    console.log(rel);
  }
}
console.log("files:", n);
