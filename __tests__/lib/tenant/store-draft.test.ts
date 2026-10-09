import { describe, expect, it } from "vitest";

import { isTenantPubliclyOpen, resolveTenantPublicView } from "@/lib/plans/tenant-subscription";
import {
	isStoreDraftPending,
	readStoreDraft,
	storeDraftAgeDays,
	storeDraftHasMenuReads,
	storeDraftPurgeDate,
	withStoreDraft,
	withStoreDraftMenuRead,
	withStoreDraftOpened,
} from "@/lib/tenant/store-draft";

const NOW = new Date("2026-10-08T12:00:00.000Z");

describe("marca de tienda en vista previa", () => {
	it("nace en vista previa y se abre conservando cuándo nació", () => {
		const theme = withStoreDraft({ displayName: "Rica Pizza", panelAccess: [] }, NOW);
		expect(readStoreDraft(theme)).toEqual({ since: NOW.toISOString(), openedAt: null, menuReads: 0 });
		expect(isStoreDraftPending({ subscription_status: "trial", theme_config: theme })).toBe(true);

		const later = new Date("2026-10-10T12:00:00.000Z");
		const opened = withStoreDraftOpened(theme, later);
		expect(opened.displayName).toBe("Rica Pizza");
		expect(readStoreDraft(opened)).toMatchObject({ since: NOW.toISOString(), openedAt: later.toISOString() });
		expect(isStoreDraftPending({ subscription_status: "trial", theme_config: opened })).toBe(false);
		// Abrirla dos veces no cambia la fecha.
		expect(readStoreDraft(withStoreDraftOpened(opened, new Date("2026-11-01T00:00:00.000Z")))?.openedAt).toBe(later.toISOString());
	});

	it("solo cuenta como vista previa en `trial`: activa a mano, se ve", () => {
		const theme = withStoreDraft({}, NOW);
		expect(isStoreDraftPending({ subscription_status: "active", theme_config: theme })).toBe(false);
		expect(isStoreDraftPending({ subscription_status: "trial", theme_config: {} })).toBe(false);
		expect(isStoreDraftPending(null)).toBe(false);
		expect(readStoreDraft({ storeDraft: { since: "no es fecha" } })).toBeNull();
	});

	it("trae una lectura de carta con IA y se acaba al usarla", () => {
		const theme = withStoreDraft({}, NOW);
		expect(storeDraftHasMenuReads(theme)).toBe(true);
		const used = withStoreDraftMenuRead(theme);
		expect(readStoreDraft(used)?.menuReads).toBe(1);
		expect(storeDraftHasMenuReads(used)).toBe(false);
		// Abierta (pagada) ya no tiene tope; sin marca tampoco.
		expect(storeDraftHasMenuReads(withStoreDraftOpened(used, NOW))).toBe(true);
		expect(storeDraftHasMenuReads({})).toBe(true);
	});

	it("cuenta los días y la fecha de borrado (30 días)", () => {
		const since = "2026-09-08T12:00:00.000Z";
		expect(storeDraftAgeDays({ since }, NOW)).toBe(30);
		expect(storeDraftPurgeDate({ since }).toISOString()).toBe("2026-10-08T12:00:00.000Z");
	});
});

describe("qué ve el público", () => {
	it("vista previa, abierta o cerrada", () => {
		const draftTheme = withStoreDraft({}, NOW);
		expect(resolveTenantPublicView({ subscription_status: "trial", subscription_ends_at: null, theme_config: draftTheme }, NOW)).toBe("draft");
		expect(resolveTenantPublicView({ subscription_status: "active", subscription_ends_at: "2026-11-08T00:00:00.000Z", theme_config: draftTheme }, NOW)).toBe("open");
		expect(resolveTenantPublicView({ subscription_status: "suspended", subscription_ends_at: "2026-09-01T00:00:00.000Z", theme_config: {} }, NOW)).toBe("closed");
		expect(isTenantPubliclyOpen({ subscription_status: "trial", subscription_ends_at: null, theme_config: draftTheme })).toBe(false);
		expect(isTenantPubliclyOpen({ subscription_status: "active", subscription_ends_at: "2099-01-01T00:00:00.000Z", theme_config: {} })).toBe(true);
	});
});
