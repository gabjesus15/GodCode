import { describe, expect, it } from "vitest";

// El auditor es un .mjs sin tipos propios; se importa por ruta a propósito.
import {
	auditFile,
	collectEntryPoints,
	detectPostures,
	hasWriteCall,
	splitHandlers,
	unguardedHandlers,
} from "../../scripts/security/audit-service-role.mjs";

/**
 * El auditor es la única barrera que impide que un endpoint nuevo use la Service
 * Role Key sin autorizar a nadie. Si el auditor deja de detectar los casos malos,
 * el CI sigue en verde y la protección desaparece sin que nadie se entere, así
 * que lo que se prueba aquí es sobre todo que sabe fallar.
 */

const ADMIN_IMPORT = 'import { supabaseAdmin } from "@/lib/infra/supabase-admin";\n';

describe("anotación @service-role", () => {
	it("un endpoint sin anotar es un fallo", () => {
		const source = `${ADMIN_IMPORT}
export async function GET() {
	return supabaseAdmin.from("companies").select("*");
}
`;
		const { problems } = auditFile("app/api/x/route.ts", source);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("falta la anotación");
	});

	it("una postura inventada es un fallo", () => {
		const source = `/** @service-role confio-en-el-frontend */\n${ADMIN_IMPORT}`;
		const { problems } = auditFile("app/api/x/route.ts", source);
		expect(problems[0]).toContain("postura desconocida");
	});

	it("declarar un guard que no está en el fichero es un fallo", () => {
		const source = `/** @service-role super-admin */
${ADMIN_IMPORT}
export async function GET() {
	return supabaseAdmin.from("companies").select("*");
}
`;
		const { problems } = auditFile("app/api/x/route.ts", source);
		expect(problems[0]).toContain("no hay rastro del guard");
	});

	it("acepta el endpoint cuando el guard declarado está presente", () => {
		const source = `/** @service-role super-admin */
${ADMIN_IMPORT}
export async function GET() {
	const permission = await validateAdminRolesOnServer(["super_admin"]);
	if (!permission.ok) return unauthorized();
	return supabaseAdmin.from("companies").select("*");
}
`;
		expect(auditFile("app/api/x/route.ts", source).problems).toEqual([]);
	});

	it("admite varias posturas en un mismo fichero", () => {
		const source = `/** @service-role super-admin, public */
${ADMIN_IMPORT}
export async function POST() {
	await validateAdminRolesOnServer(["super_admin"]);
	await assertPublicRateLimit();
	return supabaseAdmin.from("x").select("*");
}
`;
		expect(auditFile("app/api/x/route.ts", source).problems).toEqual([]);
	});
});

describe("cobertura por método HTTP", () => {
	// El fallo clásico: se añade un método nuevo a un fichero que ya estaba
	// anotado, y el guard se queda solo en los métodos viejos.
	it("señala el método que se quedó sin guard", () => {
		const source = `/** @service-role super-admin */
${ADMIN_IMPORT}
export async function GET() {
	await validateAdminRolesOnServer(["super_admin"]);
	return supabaseAdmin.from("x").select("*");
}

export async function DELETE(req: Request) {
	const { id } = await req.json();
	return supabaseAdmin.from("x").delete().eq("id", id);
}
`;
		expect(unguardedHandlers("app/api/x/route.ts", source, ["super-admin"])).toEqual(["DELETE"]);
		expect(auditFile("app/api/x/route.ts", source).problems[0]).toContain("DELETE");
	});

	it("un guard en el preámbulo cubre a todos los métodos", () => {
		const source = `/** @service-role super-admin */
${ADMIN_IMPORT}
async function guard() {
	return validateAdminRolesOnServer(["super_admin"]);
}

export async function GET() {
	await guard();
	return supabaseAdmin.from("x").select("*");
}

export async function DELETE() {
	await guard();
	return supabaseAdmin.from("x").delete();
}
`;
		expect(unguardedHandlers("app/api/x/route.ts", source, ["super-admin"])).toEqual([]);
	});

	it("un método que delega en otro hereda su guard", () => {
		const source = `/** @service-role cron-secret */
${ADMIN_IMPORT}
export async function GET(req: Request) {
	if (req.headers.get("authorization") !== process.env.CRON_SECRET) return unauthorized();
	return supabaseAdmin.from("x").select("*");
}

export async function POST(req: Request) {
	return GET(req);
}
`;
		expect(unguardedHandlers("app/api/x/route.ts", source, ["cron-secret"])).toEqual([]);
	});

	it("OPTIONS no necesita guard: solo devuelve cabeceras CORS", () => {
		const source = `/** @service-role public */
${ADMIN_IMPORT}
export async function OPTIONS(req: Request) {
	return new Response(null, { status: 204, headers: publicApiCorsHeaders(req) });
}

export async function POST(req: Request) {
	await assertPublicRateLimit(req, "x", 60, 60000);
	return supabaseAdmin.from("x").select("*");
}
`;
		expect(unguardedHandlers("app/api/x/route.ts", source, ["public"])).toEqual([]);
	});

	it("separa el preámbulo de cada método exportado", () => {
		const { preamble, handlers } = splitHandlers(`const A = 1;

export async function GET() {}

export const POST = async () => {};
`);
		expect(preamble).toContain("const A = 1;");
		expect(handlers.map((h: { method: string }) => h.method)).toEqual(["GET", "POST"]);
	});
});

describe("postura public-read", () => {
	it("acepta un catálogo que solo consulta", () => {
		const source = `/** @service-role public-read */
${ADMIN_IMPORT}
export async function GET() {
	return supabaseAdmin.from("addons").select("id,name").eq("is_active", true);
}
`;
		expect(auditFile("app/api/x/route.ts", source).problems).toEqual([]);
	});

	it.each([
		["insert", '.insert({ a: 1 })'],
		["update", '.update({ a: 1 })'],
		["upsert", '.upsert({ a: 1 })'],
		["delete", '.delete()'],
		["rpc", 'supabaseAdmin.rpc("f", {})'],
		["auth admin", "supabaseAdmin.auth.admin.deleteUser(id)"],
	])("rechaza declararse de solo lectura si hace %s", (_caso, call) => {
		const source = `/** @service-role public-read */
${ADMIN_IMPORT}
export async function POST() {
	return supabaseAdmin.from("x")${call.startsWith("supabaseAdmin") ? "" : call};
	${call.startsWith("supabaseAdmin") ? call : ""}
}
`;
		expect(hasWriteCall(source)).toBe(true);
		expect(auditFile("app/api/x/route.ts", source).problems[0]).toContain("escribe con el cliente admin");
	});
});

describe("detección de posturas", () => {
	it("layout-guard se deduce de la ruta, no del contenido", () => {
		expect(detectPostures("app/(super-admin)/plans/page.tsx", ADMIN_IMPORT)).toContain("layout-guard");
		expect(detectPostures("app/api/plans/route.ts", ADMIN_IMPORT)).not.toContain("layout-guard");
	});
});

describe("el repositorio entero", () => {
	it("no tiene ningún punto de entrada sin contrato de autorización", async () => {
		const { entryPoints } = await collectEntryPoints();

		const failures = entryPoints
			.map(({ relPath, source }: { relPath: string; source: string }) => ({
				relPath,
				problems: auditFile(relPath, source).problems,
			}))
			.filter((entry: { problems: string[] }) => entry.problems.length > 0);

		expect(failures).toEqual([]);
		// Si este número baja de golpe, alguien movió o borró rutas: revísalo.
		expect(entryPoints.length).toBeGreaterThan(80);
	});
});
