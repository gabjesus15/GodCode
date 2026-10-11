import { builtinModules } from "node:module";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * El Dockerfile del servicio de alta (services/onboarding-billing/Dockerfile) solo copia lib/,
 * utils/ y la carpeta del servicio, e instala solo las dependencias del servicio. Si algo de lo
 * que el servicio importa sale de ahí, la app compila igual (CI en verde) pero el despliegue del
 * servicio en Coolify falla: pasó el 11-oct-2026 con el tema del menú, que vivía en components/.
 *
 * Se recorren los imports con los alias del tsconfig del servicio, incluidos los de solo tipos
 * (`next build` también revisa tipos).
 */

const ROOT = path.resolve(__dirname, "../..");
const SERVICE = path.join(ROOT, "services/onboarding-billing");
const COPIED = ["lib", "utils", "services/onboarding-billing"].map((dir) => path.join(ROOT, dir) + path.sep);
// Lo que Next resuelve por su cuenta aunque el servicio no lo declare.
const NEXT_PROVIDED = new Set(["next", "react", "react-dom", "server-only", "client-only", "@swc/helpers", "styled-jsx"]);
const BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];

function resolveFile(base: string): string | null {
	if (existsSync(base) && statSync(base).isFile()) return base;
	for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
	for (const ext of EXTENSIONS) if (existsSync(path.join(base, `index${ext}`))) return path.join(base, `index${ext}`);
	return null;
}

/** Mismos alias que services/onboarding-billing/tsconfig.json. */
function resolveSpecifier(spec: string, fromFile: string): { file: string | null } | { pkg: string } {
	if (spec === "@/lib/infra/supabase-admin") return { file: resolveFile(path.join(SERVICE, "lib/supabase-admin")) };
	if (spec.startsWith("@/lib/")) return { file: resolveFile(path.join(ROOT, "lib", spec.slice("@/lib/".length))) };
	if (spec.startsWith("@/components/")) {
		return { file: resolveFile(path.join(ROOT, "components", spec.slice("@/components/".length))) };
	}
	if (spec.startsWith("@/")) return { file: resolveFile(path.join(SERVICE, spec.slice(2))) };
	if (spec.startsWith(".")) return { file: resolveFile(path.resolve(path.dirname(fromFile), spec)) };
	return { pkg: spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]! };
}

function importedSpecifiers(file: string): string[] {
	const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
	const specs: string[] = [];
	const visit = (node: ts.Node) => {
		if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
			specs.push(node.moduleSpecifier.text);
		} else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0]!)) {
			const callee = node.expression;
			if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === "require")) {
				specs.push((node.arguments[0] as ts.StringLiteralLike).text);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return specs;
}

function serviceSources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		if (name === "node_modules" || name === ".next") return [];
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) return serviceSources(full);
		return /\.(ts|tsx|js|jsx|mjs)$/.test(name) && !name.endsWith(".d.ts") ? [full] : [];
	});
}

function walkServiceImports() {
	const pkg = JSON.parse(readFileSync(path.join(SERVICE, "package.json"), "utf8")) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
	const queue = serviceSources(SERVICE);
	const seen = new Set(queue);
	const outside: string[] = [];
	const undeclared: string[] = [];
	const unresolved: string[] = [];

	while (queue.length > 0) {
		const file = queue.shift()!;
		const from = path.relative(ROOT, file).replaceAll("\\", "/");
		for (const spec of importedSpecifiers(file)) {
			const target = resolveSpecifier(spec, file);
			if ("pkg" in target) {
				if (!BUILTINS.has(spec) && !declared.has(target.pkg) && !NEXT_PROVIDED.has(target.pkg)) undeclared.push(`${target.pkg} (desde ${from})`);
				continue;
			}
			if (!target.file) {
				unresolved.push(`${spec} (desde ${from})`);
				continue;
			}
			if (!COPIED.some((dir) => target.file!.startsWith(dir))) {
				outside.push(`${path.relative(ROOT, target.file).replaceAll("\\", "/")} (desde ${from})`);
			}
			if (!seen.has(target.file) && !target.file.endsWith(".json")) {
				seen.add(target.file);
				queue.push(target.file);
			}
		}
	}
	return { reached: seen.size, outside, undeclared, unresolved };
}

describe("servicio de alta: lo que compila su Dockerfile", () => {
	const result = walkServiceImports();

	it("recorre el código del servicio y lo que importa de lib/", () => {
		expect(result.reached).toBeGreaterThan(50);
	});

	it("no importa nada fuera de lib/, utils/ y su carpeta", () => {
		expect(result.outside).toEqual([]);
	});

	it("solo usa paquetes que declara en su package.json", () => {
		expect(result.undeclared).toEqual([]);
	});

	it("resuelve todos sus imports", () => {
		expect(result.unresolved).toEqual([]);
	});
});
