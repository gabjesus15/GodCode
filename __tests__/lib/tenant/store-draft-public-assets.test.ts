import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** La empresa que devuelve la caché (y la consulta pública del favicon). */
const holder: { company: Record<string, unknown> | null } = { company: null };

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "www.godcode.me" }) }));
vi.mock("@/utils/tenant-cache", () => ({ getCachedCompany: async () => holder.company }));
vi.mock("@/utils/supabase/server", () => ({
	createSupabasePublicServerClient: () => ({
		from: () => {
			const query: Record<string, unknown> = {};
			for (const method of ["select", "eq"]) query[method] = () => query;
			query.maybeSingle = async () => ({ data: holder.company, error: null });
			return query;
		},
	}),
}));
const fetchTenantLogo = vi.fn(async () => ({ buf: Buffer.from([1, 2, 3]), contentType: "image/png" }));
vi.mock("@/lib/tenant/favicon-icon", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/tenant/favicon-icon")>()),
	fetchTenantLogo: (...args: unknown[]) => fetchTenantLogo(...(args as [])),
}));

import { GET as manifest } from "@/app/[subdomain]/menu/manifest.webmanifest/route";
import { GET as faviconIco } from "@/app/[subdomain]/favicon.ico/route";
import { GET as slugFavicon } from "@/app/[subdomain]/tenant-favicon/route";

const params = { params: Promise.resolve({ subdomain: "rica-pizza" }) };

const THEME = { displayName: "Rica Pizza", primaryColor: "#ff0000", backgroundColor: "#00ff00", logoUrl: "https://cdn.example.com/logo.png" };
const DRAFT = {
	id: "c1",
	name: "Rica Pizza",
	subscription_status: "trial",
	subscription_ends_at: null,
	updated_at: "2026-10-05T00:00:00.000Z",
	theme_config: { ...THEME, storeDraft: { since: "2026-10-01T00:00:00.000Z" } },
};
const OPEN = { ...DRAFT, subscription_status: "active", theme_config: { ...THEME, storeDraft: { since: "2026-10-01T00:00:00.000Z", openedAt: "2026-10-04T00:00:00.000Z" } } };

beforeEach(() => {
	holder.company = null;
	fetchTenantLogo.mockClear();
});

describe("marca de una tienda en vista previa en las rutas públicas", () => {
	it("el manifest de una vista previa es el genérico de Gcode", async () => {
		holder.company = DRAFT;
		const body = await (await manifest(new Request("http://localhost/rica-pizza/menu/manifest.webmanifest"), params)).json();
		expect(body.name).toBe("Gcode Menu");
		expect(body.theme_color).toBe("#111827");
		expect(body.background_color).toBe("#0a0a0a");
		expect(body.icons[0].src).toContain("v=gcode");
	});

	it("el manifest de una tienda abierta lleva su nombre y sus colores", async () => {
		holder.company = OPEN;
		const body = await (await manifest(new Request("http://localhost/rica-pizza/menu/manifest.webmanifest"), params)).json();
		expect(body.name).toBe("Rica Pizza");
		expect(body.theme_color).toBe("#ff0000");
		expect(body.icons[0].src).not.toContain("v=gcode");
	});

	it("el favicon de una vista previa no descarga el logo ni usa sus iniciales", async () => {
		holder.company = DRAFT;
		const res = await slugFavicon(new NextRequest("http://localhost/rica-pizza/tenant-favicon"), params);
		const svg = await res.text();
		expect(fetchTenantLogo).not.toHaveBeenCalled();
		expect(res.headers.get("content-type")).toContain("image/svg+xml");
		expect(svg).toContain("#111827");
		expect(svg).not.toContain("#ff0000");
		expect(svg).not.toContain(">RP<");
	});

	it("el favicon de una tienda abierta es su logo", async () => {
		holder.company = OPEN;
		const res = await slugFavicon(new NextRequest("http://localhost/rica-pizza/tenant-favicon"), params);
		expect(fetchTenantLogo).toHaveBeenCalledTimes(1);
		expect(res.headers.get("content-type")).toBe("image/png");
	});

	it("favicon.ico redirige con una ruta relativa (sin la dirección interna del proxy)", async () => {
		holder.company = DRAFT;
		const draft = await faviconIco(new Request("http://0.0.0.0:3000/rica-pizza/favicon.ico"), params);
		expect(draft.status).toBe(302);
		expect(draft.headers.get("location")).toBe("/rica-pizza/tenant-favicon?v=gcode");

		holder.company = OPEN;
		const open = await faviconIco(new Request("http://0.0.0.0:3000/rica-pizza/favicon.ico"), params);
		expect(open.headers.get("location")).toMatch(/^\/rica-pizza\/tenant-favicon\?v=2026-10-05/);
	});
});
