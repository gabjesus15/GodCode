#!/usr/bin/env node
/**
 * Auditoría del uso de la Service Role Key (discrepancia nº3 del nodo).
 *
 * El cliente `supabaseAdmin` ignora las políticas RLS de Postgres: cualquier
 * consulta que pase por él ve la base entera. Eso es legítimo en un backend,
 * pero solo si el propio código autoriza al llamante antes de usarlo. Como RLS
 * no está ahí de red de seguridad, olvidar esa comprobación en un endpoint
 * nuevo no rompe nada visible: simplemente expone datos de todos los tenants.
 *
 * Este script convierte esa decisión implícita en un contrato explícito. Cada
 * punto de entrada (route handler, page, layout o server action) que importe
 * `supabaseAdmin` debe declarar cómo autoriza:
 *
 *     // @service-role customer-account
 *
 * y el script comprueba que la declaración se corresponde con una llamada real
 * al guard que dice usar. Un endpoint sin anotar, o anotado con un guard que no
 * aparece en el fichero, rompe el CI.
 *
 * Uso:
 *   node scripts/security/audit-service-role.mjs             verifica (exit 1 si falla)
 *   node scripts/security/audit-service-role.mjs --suggest   propone la postura de cada fichero
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const IGNORED_DIRS = new Set([
	"node_modules",
	".next",
	".git",
	"test-results",
	"playwright-report",
	"coverage",
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

const ADMIN_IMPORT = /from\s+["'][^"']*(?:lib\/infra\/supabase-admin|lib\/supabase-admin)["']/;

/**
 * Cada postura declara qué prueba exigimos en el fichero. `evidence` es lo que
 * debe aparecer en el código; `pathPrefix` cubre el caso en que el guard vive en
 * un layout que envuelve al fichero en lugar de en el fichero mismo.
 */
export const POSTURES = {
	"super-admin": {
		description: "rol super_admin verificado contra la sesión",
		evidence: /validateAdminRolesOnServer|validateSuperAdminAccess/,
	},
	"layout-guard": {
		description: "el layout del segmento ya exige super_admin antes de renderizar",
		pathPrefix: "app/(super-admin)/",
	},
	"customer-account": {
		description: "sesión de CEO del portal, con company_id tomado del contexto",
		evidence: /getCustomerAccountContext/,
	},
	"tenant-session": {
		description: "sesión del panel del tenant, con company_id tomado de la sesión",
		evidence:
			/getTicketAuthContext|getCeoSession|getCustomerMembership|getSuperAdminRoleByEmail|createSupabaseServerClient/,
	},
	"internal-api-key": {
		description: "clave interna del microservicio (x-internal-api-key)",
		evidence: /validateApiKey/,
	},
	"cron-secret": {
		description: "secreto de cron en la cabecera Authorization",
		evidence: /CRON_SECRET/,
	},
	"capability-token": {
		description:
			"token no adivinable en la petición (verification_token, client_request_id…)",
		evidence:
			/verification_token|client_request_id|clientRequestId|evidenceId|payment_reference|HEALTH_CHECK_SECRET/,
	},
	public: {
		description: "sin sesión a propósito (storefront anónimo); exige rate limit",
		evidence:
			/assertPublicRateLimit|assertJsonRateLimit|assertPublicScopedRateLimit|enforceRateLimit|enforceScopedRateLimit|assertCustomerAccountRateLimit|isRateLimited|verifyRecaptcha/,
	},
	"webhook-signature": {
		description: "firma criptográfica de la pasarela verificada contra el cuerpo crudo",
		evidence: /constructEvent|stripe-signature/,
	},
	"payment-provider-verified": {
		description: "el estado del pago se confirma contra la pasarela, no contra la petición",
		evidence: /OrdersController|api\.stripe\.com/,
	},
	"public-read": {
		description:
			"catálogo o página pública de solo lectura; el fichero no puede escribir nada",
		readOnly: true,
	},
	"proxy-only": {
		description: "no consulta datos: solo reenvía al microservicio, que autoriza",
		evidence: /proxyToOnboardingBilling|forwardOnboardingBilling/,
	},
};

const ANNOTATION = /@service-role\s+([a-z-]+(?:\s*,\s*[a-z-]+)*)/;

/**
 * Escrituras a través del cliente admin. Sirve para verificar `public-read`: si
 * el fichero declara ser de solo lectura, ninguna de estas puede aparecer.
 * `.rpc(` cuenta como escritura porque una función de Postgres puede mutar.
 */
const WRITE_CALL = /\.(insert|update|upsert|delete|rpc)\(|auth\.admin\.|storage\.from\([^)]*\)\s*\.\s*(upload|remove|move|copy)/;

export function hasWriteCall(source) {
	return WRITE_CALL.test(source);
}

/** Un punto de entrada es alcanzable desde fuera; un helper solo desde otro fichero. */
export function isEntryPoint(relPath, source) {
	const normalized = relPath.split(path.sep).join("/");
	if (/(^|\/)app\/.*\/(route\.ts|page\.tsx|layout\.tsx)$/.test(normalized)) return true;
	if (normalized === "proxy.ts") return true;
	return /^\s*["']use server["']/m.test(source);
}

export function parseAnnotation(source) {
	const match = source.match(ANNOTATION);
	if (!match) return null;
	return match[1]
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

/** Devuelve las posturas que el fichero puede justificar con el código que tiene. */
export function detectPostures(relPath, source) {
	const normalized = relPath.split(path.sep).join("/");
	return Object.entries(POSTURES)
		.filter(([, rule]) => {
			if (rule.pathPrefix) return normalized.startsWith(rule.pathPrefix);
			if (rule.readOnly) return !hasWriteCall(source);
			return rule.evidence.test(source);
		})
		.map(([name]) => name);
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const HANDLER_START = new RegExp(
	String.raw`^export\s+(?:async\s+)?(?:function\s+(${HTTP_METHODS.join("|")})\b|const\s+(${HTTP_METHODS.join("|")})\s*=)`,
	"m",
);

/**
 * Trocea un route handler en {preámbulo, un segmento por método HTTP}.
 *
 * El guard tiene que estar en cada método exportado, no solo en el primero: la
 * variante clásica de este fallo es un fichero con GET/POST/DELETE donde solo
 * dos comprueban el rol. Lo que esté en el preámbulo (helpers a nivel de módulo)
 * cuenta para todos, porque cualquier método puede llamarlo.
 */
export function splitHandlers(source) {
	const lines = source.split("\n");
	const preamble = [];
	const handlers = [];
	let current = null;

	for (const line of lines) {
		const match = HANDLER_START.exec(line);
		if (match) {
			current = { method: match[1] ?? match[2], body: [line] };
			handlers.push(current);
			continue;
		}
		if (current) current.body.push(line);
		else preamble.push(line);
	}

	return {
		preamble: preamble.join("\n"),
		handlers: handlers.map((handler) => ({ method: handler.method, body: handler.body.join("\n") })),
	};
}

/** Métodos exportados que no pueden justificar ninguna de las posturas declaradas. */
export function unguardedHandlers(relPath, source, declared) {
	// Estas dos no dependen del cuerpo del método: o el layout envuelve al
	// fichero, o el fichero entero es de solo lectura.
	if (declared.some((posture) => POSTURES[posture]?.pathPrefix || POSTURES[posture]?.readOnly)) {
		return [];
	}

	const { preamble, handlers } = splitHandlers(source);
	if (handlers.length === 0) return [];

	const evidences = declared
		.map((posture) => POSTURES[posture]?.evidence)
		.filter(Boolean);
	if (evidences.length === 0) return [];

	const covers = (text) => evidences.some((evidence) => evidence.test(text));
	if (covers(preamble)) return [];

	const byMethod = new Map(handlers.map((handler) => [handler.method, handler]));

	/** `export async function POST(req) { return GET(req); }` hereda el guard de GET. */
	const delegateOf = (handler) => {
		const match = handler.body.match(
			new RegExp(String.raw`return\s+(${HTTP_METHODS.join("|")})\s*\(`),
		);
		return match ? byMethod.get(match[1]) : undefined;
	};

	const isCovered = (handler, seen = new Set()) => {
		if (!handler || seen.has(handler.method)) return false;
		seen.add(handler.method);
		if (covers(handler.body)) return true;
		return isCovered(delegateOf(handler), seen);
	};

	return handlers
		// OPTIONS solo responde cabeceras CORS: no consulta datos.
		.filter((handler) => handler.method !== "OPTIONS" && !isCovered(handler))
		.map((handler) => handler.method);
}

export function auditFile(relPath, source) {
	const problems = [];
	const declared = parseAnnotation(source);
	const detected = detectPostures(relPath, source);

	if (!declared) {
		const hint = detected.length
			? detected.join(", ")
			: "ninguna — el fichero no autoriza a nadie";
		return {
			problems: [`falta la anotación @service-role. Posturas que el código respalda: ${hint}`],
			declared,
			detected,
		};
	}

	for (const posture of declared) {
		if (!POSTURES[posture]) {
			problems.push(
				`postura desconocida "${posture}". Válidas: ${Object.keys(POSTURES).join(", ")}`,
			);
			continue;
		}
		if (detected.includes(posture)) continue;

		if (POSTURES[posture].readOnly) {
			problems.push(
				`declara "${posture}" pero escribe con el cliente admin (insert/update/upsert/delete/rpc/storage). Una escritura pública necesita otro contrato`,
			);
		} else {
			problems.push(
				`declara "${posture}" pero no hay rastro del guard en el fichero (${POSTURES[posture].description})`,
			);
		}
	}

	if (problems.length === 0) {
		const uncovered = unguardedHandlers(relPath, source, declared);
		if (uncovered.length) {
			problems.push(
				`el guard declarado no aparece en ${uncovered.join(", ")}: ese método queda sin autorizar`,
			);
		}
	}

	return { problems, declared, detected };
}

async function collectSources(dir, acc = []) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (IGNORED_DIRS.has(entry.name)) continue;
			await collectSources(full, acc);
		} else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
			acc.push(full);
		}
	}
	return acc;
}

export async function collectEntryPoints() {
	const files = await collectSources(ROOT);
	const entryPoints = [];
	let helpers = 0;

	for (const file of files) {
		const relPath = path.relative(ROOT, file).split(path.sep).join("/");
		if (relPath.startsWith("__tests__/") || relPath.startsWith("scripts/")) continue;
		const source = readFileSync(file, "utf8");
		if (!ADMIN_IMPORT.test(source)) continue;
		if (!isEntryPoint(relPath, source)) {
			helpers += 1;
			continue;
		}
		entryPoints.push({ relPath, source });
	}

	entryPoints.sort((a, b) => a.relPath.localeCompare(b.relPath));
	return { entryPoints, helpers };
}

async function main() {
	const suggest = process.argv.includes("--suggest");
	const { entryPoints, helpers } = await collectEntryPoints();

	if (suggest) {
		for (const { relPath, source } of entryPoints) {
			const detected = detectPostures(relPath, source);
			console.log(`${detected.join(", ") || "NINGUNA"}\t${relPath}`);
		}
		return;
	}

	const failures = [];
	for (const { relPath, source } of entryPoints) {
		const { problems } = auditFile(relPath, source);
		if (problems.length) failures.push({ relPath, problems });
	}

	console.log(
		`Service Role: ${entryPoints.length} puntos de entrada auditados, ${helpers} helpers internos (autorizan sus llamantes).`,
	);

	if (failures.length === 0) {
		console.log("Todos declaran como autorizan y el guard declarado esta presente.");
		return;
	}

	console.error(`\n${failures.length} punto(s) de entrada sin contrato de autorizacion valido:\n`);
	for (const { relPath, problems } of failures) {
		console.error(`  ${relPath}`);
		for (const problem of problems) console.error(`    - ${problem}`);
	}
	console.error(
		"\nAnade un comentario `// @service-role <postura>` arriba del fichero, con la postura que\nrealmente aplica. Si ninguna encaja, el endpoint no esta autorizando a nadie: eso es el bug.",
	);
	process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
