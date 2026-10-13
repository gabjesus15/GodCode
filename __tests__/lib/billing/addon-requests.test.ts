import { describe, expect, it } from "vitest";

import {
	nextStatusForAdminAction,
	nextStatusForOwnerAction,
	parseAddonQuote,
	parseAddonRequestDraft,
	privateAddonSlug,
	toAddonRequestSummary,
} from "@/lib/billing/addon-requests";
import { isSingleInstanceAddon } from "@/lib/plans/addon-pricing";
import { sanitizeAddonUnlockTabs, sanitizePanelModule } from "@/lib/plans/addon-unlocks";

describe("pedidos de extras a medida", () => {
	it("valida lo que manda el dueño", () => {
		expect(parseAddonRequestDraft({ title: "ab", description: "algo más largo" })).toMatchObject({ ok: false });
		expect(parseAddonRequestDraft({ title: "Cuadre", description: "corto" })).toMatchObject({ ok: false });
		expect(parseAddonRequestDraft({ title: "  Cuadre   de caja ", description: "Cuadrar ventas con los puntos", urgency: "x" })).toEqual({
			ok: true,
			draft: { title: "Cuadre de caja", description: "Cuadrar ventas con los puntos", urgency: "normal" },
		});
	});

	it("el dueño cancela, rechaza o acepta según el estado", () => {
		expect(nextStatusForOwnerAction("submitted", "cancel")).toEqual({ ok: true, status: "cancelled" });
		expect(nextStatusForOwnerAction("paid", "cancel")).toMatchObject({ ok: false });
		expect(nextStatusForOwnerAction("quoted", "reject_quote")).toEqual({ ok: true, status: "rejected" });
		expect(nextStatusForOwnerAction("submitted", "accept")).toMatchObject({ ok: false });
		expect(nextStatusForOwnerAction("quoted", "accept")).toEqual({ ok: true, status: "accepted" });
		// Volver a aceptar reabre el pago.
		expect(nextStatusForOwnerAction("accepted", "accept")).toEqual({ ok: true, status: "accepted" });
	});

	it("el equipo rechaza lo no pagado y entrega lo pagado", () => {
		expect(nextStatusForAdminAction("quoted", "reject")).toEqual({ ok: true, status: "rejected" });
		expect(nextStatusForAdminAction("paid", "reject")).toMatchObject({ ok: false });
		expect(nextStatusForAdminAction("paid", "deliver")).toEqual({ ok: true, status: "delivered" });
		expect(nextStatusForAdminAction("accepted", "deliver")).toMatchObject({ ok: false });
	});

	it("la cotización exige un precio positivo", () => {
		expect(parseAddonQuote({ amount: 0 })).toMatchObject({ ok: false });
		expect(parseAddonQuote({ amount: "120.456", billing: "monthly", note: "  " })).toEqual({
			ok: true,
			quote: { amount: 120.46, billing: "monthly", note: null },
		});
	});

	it("resume la fila para /cuenta", () => {
		const summary = toAddonRequestSummary({
			id: "r1",
			company_id: "c1",
			requested_by_email: null,
			title: "T",
			description: "D",
			urgency: "normal",
			status: "raro",
			quote_amount: "80",
			quote_billing: "one_time",
			quote_note: null,
			addon_id: null,
			quoted_at: null,
			delivered_at: null,
			created_at: "2026-10-12T00:00:00Z",
			updated_at: "2026-10-12T00:00:00Z",
		});
		expect(summary).toMatchObject({ status: "submitted", quoteAmount: 80, quoteBilling: "one_time" });
	});

	it("los extras privados son de una sola compra y tienen slug propio", () => {
		expect(isSingleInstanceAddon({ name: "Reporte", company_id: "c1" })).toBe(true);
		expect(isSingleInstanceAddon({ name: "Carga de menú" })).toBe(false);
		expect(privateAddonSlug("5b6c7d8e-9f01-4a2b-8c3d-4e5f6a7b8c9d")).toBe("custom-5b6c7d8e9f01");
	});

	it("solo guarda pestañas conocidas", () => {
		expect(sanitizeAddonUnlockTabs(["caja", "inventada", "caja", 3, "drinks"])).toEqual(["caja", "beverages"]);
		expect(sanitizeAddonUnlockTabs("caja")).toEqual([]);
	});

	it("el módulo del panel es el nombre de una carpeta válida", () => {
		expect(sanitizePanelModule(" Cuadre-Caja ")).toBe("cuadre-caja");
		expect(sanitizePanelModule("")).toBeNull();
		expect(sanitizePanelModule("_plantilla")).toBeNull();
		expect(sanitizePanelModule("../otro")).toBeNull();
		expect(sanitizePanelModule("a")).toBeNull();
	});
});
