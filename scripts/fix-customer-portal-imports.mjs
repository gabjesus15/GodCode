import fs from "node:fs";
import path from "node:path";

const BASE = path.resolve(import.meta.dirname, "../components/customer-portal");

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
}

function norm(relPath) {
  return relPath.split(path.sep).join("/");
}

function fixContent(relPath, s) {
  const r = norm(relPath);
  if (r.startsWith("hooks/")) {
    return s.replace(/from ['"]\.\.\/customer-account-/g, `from "../shared/customer-account-`);
  }
  if (r.startsWith("store-theme/")) {
    return s.replace(/from ['"]\.\/customer-account-/g, `from "../shared/customer-account-`);
  }
  if (r === "shell/CustomerAccountShell.tsx") {
    return s
      .replace(/from ['"]\.\/ui\//g, `from "../ui/`)
      .replace(/from ['"]\.\/customer-account-/g, `from "../shared/customer-account-`);
  }
  if (r.startsWith("account/tabs/")) {
    return s
      .replace(/from ['"]\.\.\/customer-account-/g, `from "../../shared/customer-account-`)
      .replace(
        /from ['"]\.\.\/store-theme-preview-panel['"]/g,
        `from "../../store-theme/store-theme-preview-panel"`,
      )
      .replace(/from ['"]\.\.\/ui\//g, `from "../../ui/`);
  }
  return s;
}

const files = [];
walk(BASE, files);
let n = 0;
for (const f of files) {
  const rel = norm(path.relative(BASE, f));
  const b = fs.readFileSync(f, "utf8");
  const a = fixContent(rel, b);
  if (a !== b) {
    fs.writeFileSync(f, a, "utf8");
    n++;
  }
}
console.log("customer-portal internal fixes:", n);
