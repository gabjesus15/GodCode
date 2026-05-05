import fs from "node:fs";
import path from "node:path";

const BASE = path.resolve(import.meta.dirname, "../components/landing");

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
}

const files = [];
walk(BASE, files);
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const n = s.replace(/from ["']\.\.\/\.\.\/utils\/cn["']/g, 'from "@/utils/cn"');
  if (n !== s) fs.writeFileSync(f, n, "utf8");
}
