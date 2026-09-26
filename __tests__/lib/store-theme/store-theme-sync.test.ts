import { describe, expect, it } from "vitest";

import { DEFAULT_STORE_THEME } from "@/components/customer-portal/shared/customer-account-store-theme-constants";
import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { formatThemeColor, parseThemeColor } from "@/lib/store-theme/apply-theme-css-vars";
import { mergeThemeConfig, storeThemePatchFromRawDraft } from "@/lib/store-theme/merge-theme-config";
import { diffStoreTheme, rebaseStoreTheme } from "@/lib/store-theme/store-theme-utils";
import { applyStoreThemeDraftPatch, normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";

const base: StoreThemeConfig = {
	...DEFAULT_STORE_THEME,
	displayName: "Rica Pizza",
	primaryColor: "#c11801",
	backgroundColor: "rgba(0, 0, 0, 0.3)",
	logoUrl: "company/storefront/branding/logo/a.png",
};

/** Publicar desde /cuenta: igual que app/api/customer-account/store-theme/publish. */
function publish(published: Record<string, unknown>, draft: StoreThemeConfig) {
	const normalized = normalizeStoreThemeConfig(draft);
	return mergeThemeConfig(published, storeThemePatchFromRawDraft(draft, normalized as unknown as Record<string, unknown>));
}

describe("diffStoreTheme", () => {
	it("devuelve solo los campos cambiados", () => {
		expect(diffStoreTheme({ ...base, fontFamily: "anton" }, base)).toEqual({ fontFamily: "anton" });
		expect(diffStoreTheme(base, base)).toEqual({});
	});
});

describe("rebaseStoreTheme", () => {
	it("toma lo nuevo del servidor y conserva lo que el dueño cambió en pantalla", () => {
		const server = { ...base, primaryColor: "#123456" };
		const local = { ...base, fontFamily: "anton" };
		const next = rebaseStoreTheme(local, base, server);
		expect(next.primaryColor).toBe("#123456");
		expect(next.fontFamily).toBe("anton");
	});

	it("si ambos cambiaron el mismo campo gana lo de pantalla (aún sin guardar)", () => {
		const next = rebaseStoreTheme({ ...base, primaryColor: "#000001" }, base, { ...base, primaryColor: "#123456" });
		expect(next.primaryColor).toBe("#000001");
	});
});

describe("applyStoreThemeDraftPatch", () => {
	it("mezcla el parche sobre el borrador guardado e ignora claves ajenas", () => {
		const out = applyStoreThemeDraftPatch(base, { fontFamily: "anton", panelAccess: ["x"] });
		expect(out.fontFamily).toBe("anton");
		expect(out.primaryColor).toBe(base.primaryColor);
		expect("panelAccess" in out).toBe(false);
	});
});

describe("super admin ↔ /cuenta", () => {
	it("un cambio de soporte sobrevive al autoguardado y a la publicación del dueño", () => {
		// El dueño abrió el editor con este borrador.
		const ownerLoaded = { ...base };
		let dbDraft: StoreThemeConfig = { ...base };
		let published: Record<string, unknown> = { ...base, panelAccess: ["orders"] };

		// Soporte cambia solo el color principal y publica (se mezcla en publicado y borrador).
		const adminPatch = { primaryColor: "#0055ff" };
		published = mergeThemeConfig(published, adminPatch);
		dbDraft = normalizeStoreThemeConfig(mergeThemeConfig(dbDraft, adminPatch));

		// El dueño, sin recargar, cambia la tipografía y el editor autoguarda.
		const ownerLocal = { ...ownerLoaded, fontFamily: "anton" };
		dbDraft = applyStoreThemeDraftPatch(dbDraft, diffStoreTheme(ownerLocal, ownerLoaded));
		expect(dbDraft.primaryColor).toBe("#0055ff");
		expect(dbDraft.fontFamily).toBe("anton");

		// Publica: queda el color de soporte, su tipografía y los accesos del panel.
		published = publish(published, dbDraft);
		expect(published.primaryColor).toBe("#0055ff");
		expect(published.fontFamily).toBe("anton");
		expect(published.panelAccess).toEqual(["orders"]);
	});

	it("soporte no pisa lo que el dueño tiene sin publicar si solo cambia otro campo", () => {
		const dbDraft = { ...base, primaryColor: "#ff00aa" }; // pendiente del dueño
		const adminPatch = { logoUrl: "company/storefront/branding/logo/b.png" }; // solo lo cambiado
		const merged = normalizeStoreThemeConfig(mergeThemeConfig(dbDraft, adminPatch));
		expect(merged.primaryColor).toBe("#ff00aa");
		expect(merged.logoUrl).toBe(adminPatch.logoUrl);
	});

	it("cambiar el tono del fondo en el super admin conserva el tinte (alpha)", () => {
		const current = parseThemeColor("rgba(0, 0, 0, 0.3)");
		expect(formatThemeColor("#ff0000", current.alpha)).toBe("rgba(255, 0, 0, 0.3)");
		const clear = parseThemeColor("rgba(226, 226, 226, 0)");
		expect(parseThemeColor(formatThemeColor("#123456", clear.alpha)).alpha).toBe(0);
	});
});
