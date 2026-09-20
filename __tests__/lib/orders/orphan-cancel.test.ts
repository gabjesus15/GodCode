import { describe, expect, it } from "vitest";

import {
	ORDER_PATCH_WINDOW_MS,
	canAutoCancelOrphanOrder,
	orderPatchEligibility,
	orphanCancelNote,
} from "@/lib/orders/orphan-cancel";

const AHORA = Date.parse("2026-09-17T18:00:00.000Z");
const haceMinutos = (min: number) => new Date(AHORA - min * 60_000).toISOString();

describe("elegibilidad del cierre de pedido público", () => {
	it("acepta el pedido recién creado y pendiente", () => {
		expect(
			orderPatchEligibility({ status: "pending", createdAt: haceMinutos(1) }, AHORA),
		).toBe("ok");
	});

	it("rechaza el pedido que ya pasó la ventana", () => {
		expect(
			orderPatchEligibility({ status: "pending", createdAt: haceMinutos(11) }, AHORA),
		).toBe("expired");
	});

	// El reloj de la app y el de la base pueden no coincidir: un pedido "del futuro"
	// es señal de desfase, no permiso para cerrar cualquier cosa.
	it("rechaza el pedido con fecha futura o ilegible", () => {
		expect(
			orderPatchEligibility({ status: "pending", createdAt: haceMinutos(-11) }, AHORA),
		).toBe("expired");
		expect(orderPatchEligibility({ status: "pending", createdAt: "ayer" }, AHORA)).toBe("expired");
		expect(orderPatchEligibility({ status: "pending", createdAt: null }, AHORA)).toBe("expired");
	});

	it("rechaza el pedido que ya avanzó", () => {
		expect(
			orderPatchEligibility({ status: "preparing", createdAt: haceMinutos(1) }, AHORA),
		).toBe("not_pending");
	});
});

/**
 * La ruta es pública y los id son correlativos: si la cancelación alcanzara más
 * que el pedido recién nacido, serviría para tumbar los de otros.
 */
describe("cancelación del pedido huérfano", () => {
	it("solo cancela lo que el cierre habría podido tocar", () => {
		expect(
			canAutoCancelOrphanOrder({ status: "pending", createdAt: haceMinutos(2) }, AHORA),
		).toBe(true);
		expect(
			canAutoCancelOrphanOrder({ status: "pending", createdAt: haceMinutos(30) }, AHORA),
		).toBe(false);
		expect(
			canAutoCancelOrphanOrder({ status: "delivered", createdAt: haceMinutos(2) }, AHORA),
		).toBe(false);
	});

	it("usa la misma ventana que el cierre", () => {
		const justoDentro = new Date(AHORA - ORDER_PATCH_WINDOW_MS + 1_000).toISOString();
		const justoFuera = new Date(AHORA - ORDER_PATCH_WINDOW_MS - 1_000).toISOString();
		expect(canAutoCancelOrphanOrder({ status: "pending", createdAt: justoDentro }, AHORA)).toBe(true);
		expect(canAutoCancelOrphanOrder({ status: "pending", createdAt: justoFuera }, AHORA)).toBe(false);
	});

	it("deja rastro sin borrar la nota del pedido", () => {
		expect(orphanCancelNote("[Sucursal: Horno 1]", "Tarifa de envío no válida")).toBe(
			"[Sucursal: Horno 1]\n[AUTO-CANCEL] Fallo post-creacion: Tarifa de envío no válida",
		);
		expect(orphanCancelNote(null, "")).toBe("[AUTO-CANCEL] Fallo post-creacion: patch");
	});
});
