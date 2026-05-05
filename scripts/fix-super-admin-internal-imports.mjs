import fs from "node:fs";
import path from "node:path";

const BASE = path.resolve(import.meta.dirname, "../components/super-admin");

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
}

function fix(s) {
  return s
    .replace(/from ['"]\.\.\/ui\//g, 'from "@/components/ui/')
    .replace(/from ['"]\.\.\/\.\.\/utils\//g, 'from "@/utils/')
    .replace(/from ['"]\.\.\/tenant\//g, 'from "@/components/tenant/')
    .replace(/from ['"]\.\/admin-role-context['"]/g, 'from "@/components/super-admin/shell/admin-role-context"')
    .replace(/from ['"]\.\/admin-tab-styles['"]/g, 'from "@/components/super-admin/shell/admin-tab-styles"')
    .replace(/from ['"]\.\/copy-field-button['"]/g, 'from "@/components/super-admin/shared/copy-field-button"')
    .replace(/from ['"]\.\/branding-preview['"]/g, 'from "@/components/super-admin/branches/branding-preview"')
    .replace(/from ['"]\.\/metric-card['"]/g, 'from "@/components/super-admin/analytics/metric-card"');
}

const files = [];
walk(BASE, files);
let n = 0;
for (const f of files) {
  const b = fs.readFileSync(f, "utf8");
  const a = fix(b);
  if (a !== b) {
    fs.writeFileSync(f, a, "utf8");
    n++;
  }
}
console.log("files", n);
