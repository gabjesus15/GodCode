import { describe, expect, it } from "vitest";

import { describeStatus, PAYMENT_STATUSES, SUBSCRIPTION_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/status/status-labels";
import { resolveActiveNav, SUPER_ADMIN_NAV } from "@/lib/super-admin/super-admin-nav";

describe("describeStatus", () => {
	it("da nombre y tono en español a los valores de la base", () => {
		expect(describeStatus(SUBSCRIPTION_STATUSES, "trial")).toEqual({ label: "Prueba", tone: "info" });
		expect(describeStatus(SUBSCRIPTION_STATUSES, "CANCELLED")).toEqual({ label: "Cancelada", tone: "warning" });
		expect(describeStatus(PAYMENT_STATUSES, "pending_validation")).toEqual({ label: "En revisión", tone: "warning" });
		expect(describeStatus(TICKET_PRIORITIES, "critical")).toEqual({ label: "Crítica", tone: "danger" });
	});

	it("acepta los valores antiguos en español", () => {
		expect(describeStatus(TICKET_STATUSES, "resuelto").label).toBe("Resuelto");
		expect(describeStatus(TICKET_PRIORITIES, "alta").label).toBe("Alta");
	});

	it("un estado desconocido se muestra legible y neutro; vacío usa el texto por defecto", () => {
		expect(describeStatus(PAYMENT_STATUSES, "chargeback_open")).toEqual({ label: "chargeback open", tone: "neutral" });
		expect(describeStatus(PAYMENT_STATUSES, null, "Sin pago")).toEqual({ label: "Sin pago", tone: "neutral" });
	});
});

describe("resolveActiveNav", () => {
	it("marca la entrada más específica", () => {
		expect(resolveActiveNav("/dashboard/pagos")?.item.label).toBe("Pagos por validar");
		expect(resolveActiveNav("/dashboard")?.item.label).toBe("Inicio");
		expect(resolveActiveNav("/companies/123")?.item.label).toBe("Empresas");
		expect(resolveActiveNav("/herramientas/autenticador")?.item.label).toBe("Doble factor");
		expect(resolveActiveNav("/herramientas")?.group.label).toBe("Sitio y ajustes");
	});

	it("no confunde prefijos parecidos", () => {
		expect(resolveActiveNav("/dashboardx")).toBeNull();
		expect(resolveActiveNav("/cuenta")).toBeNull();
	});

	it("cada ruta del menú es única", () => {
		const hrefs = SUPER_ADMIN_NAV.map((item) => item.href);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});
});
