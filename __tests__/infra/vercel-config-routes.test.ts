import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function apiPathFromUrlPath(urlPath: string): string {
	/** ej. `/api/system/cron/foo` → `app/api/system/cron/foo/route.ts` */
	const trimmed = urlPath.replace(/^\//, "");
	return join(process.cwd(), "app", ...trimmed.split("/"), "route.ts");
}

describe("vercel.json ↔ rutas App Router", () => {
	it("cada cron path existe como route.ts", () => {
		const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
		const config = JSON.parse(raw) as { crons?: Array<{ path: string }> };
		expect(Array.isArray(config.crons)).toBe(true);
		for (const cron of config.crons ?? []) {
			const fsPath = apiPathFromUrlPath(cron.path);
			expect(existsSync(fsPath), `Falta handler para cron ${cron.path} → ${fsPath}`).toBe(true);
		}
	});

	it("sitemap se genera de forma nativa con app/sitemap.ts", () => {
		const sitemapPath = join(process.cwd(), "app", "sitemap.ts");
		expect(existsSync(sitemapPath)).toBe(true);
	});
});
