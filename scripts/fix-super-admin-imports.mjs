import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const MAP = [
  ["admin-shell", "shell"],
  ["sidebar", "shell"],
  ["admin-header-clock", "shell"],
  ["admin-shortcuts-help", "shell"],
  ["admin-command-palette", "shell"],
  ["admin-role-context", "shell"],
  ["admin-tab-styles", "shell"],
  ["saas-admin-pwa-register", "shell"],
  ["SaasLogo", "shell"],
  ["AnimatedLogo", "shell"],
  ["companies-table", "companies"],
  ["companies-view", "companies"],
  ["company-form", "companies"],
  ["company-global-form", "companies"],
  ["company-global-tab", "companies"],
  ["company-tabs", "companies"],
  ["company-status-toggle", "companies"],
  ["company-delete-button", "companies"],
  ["company-uber-credentials-form", "companies"],
  ["company-health", "companies"],
  ["branches-create-form", "branches"],
  ["branches-table", "branches"],
  ["branch-row", "branches"],
  ["branding-preview", "branches"],
  ["tickets-manager", "tickets"],
  ["broadcasts-manager", "broadcasts"],
  ["roles-manager", "roles"],
  ["admin-modules-manager", "roles"],
  ["analytics-country-map", "analytics"],
  ["metric-card", "analytics"],
  ["dashboard-period-tabs", "analytics"],
  ["super-admin-mfa-enroll", "mfa"],
  ["copy-field-button", "shared"],
];

const SKIP = new Set(["node_modules", ".next", ".git"]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP.has(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      out.push(p);
    }
  }
}

function migrate(text) {
  let s = text;
  for (const [name, folder] of MAP) {
    const patterns = [
      [`@/components/super-admin/${name}`, `@/components/super-admin/${folder}/${name}`],
      [`components/super-admin/${name}`, `components/super-admin/${folder}/${name}`],
    ];
    for (const [a, b] of patterns) {
      s = s.split(a).join(b);
    }
  }
  return s;
}

const files = [];
walk(ROOT, files);

let n = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = migrate(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    n++;
  }
}
console.log("updated files:", n);
