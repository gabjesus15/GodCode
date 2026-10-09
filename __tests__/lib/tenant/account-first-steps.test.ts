import { describe, expect, it } from "vitest";

import { buildFirstSteps } from "@/lib/tenant/account-first-steps";

const base = { productCount: 0, sampleCount: 0, branches: [{}], logoUrl: null, orderCount: 0 };

describe("buildFirstSteps", () => {
	it("una tienda recién creada tiene todo pendiente y el menú primero", () => {
		const steps = buildFirstSteps(base);
		expect(steps.map((s) => s.id)).toEqual(["menu", "whatsapp", "hours", "logo", "design", "first_order"]);
		expect(steps.every((s) => !s.done)).toBe(true);
		expect(steps[0]).toMatchObject({ target: "menu", actionLabel: "Cargar mi menú" });
	});

	it("los productos de ejemplo no cuentan como menú cargado", () => {
		const [menu] = buildFirstSteps({ ...base, productCount: 12, sampleCount: 12 });
		expect(menu.done).toBe(false);
		expect(menu.detail).toContain("12 productos de ejemplo");
		expect(menu.actionLabel).toBe("Revisar mi menú");

		const [withOwn] = buildFirstSteps({ ...base, productCount: 13, sampleCount: 12 });
		expect(withOwn.done).toBe(true);
	});

	it("marca WhatsApp, horario, logo y primer pedido con los datos reales", () => {
		const steps = buildFirstSteps({
			...base,
			branches: [{ whatsapp_url: "https://wa.me/56912345678", schedule: "Lun a Vie 12-22" }],
			logoUrl: "https://cdn/logo.png",
			orderCount: 3,
		});
		expect(Object.fromEntries(steps.map((s) => [s.id, s.done]))).toEqual({
			menu: false,
			whatsapp: true,
			hours: true,
			logo: true,
			design: false,
			first_order: true,
		});
	});

	it("el diseño queda listo al elegir plantilla o al terminar «Configura tu tienda», y abre el asistente", () => {
		const design = (input: Partial<Parameters<typeof buildFirstSteps>[0]>) => buildFirstSteps({ ...base, ...input }).find((s) => s.id === "design")!;
		expect(design({})).toMatchObject({ done: false, target: "setup", setupStep: "diseno" });
		expect(design({ templateId: "nori" }).done).toBe(true);
		expect(design({ setupFinished: true }).done).toBe(true);
	});

	it("en vista previa el último paso es publicar la tienda, no compartir el enlace", () => {
		const steps = buildFirstSteps({ ...base, orderCount: 2, storeDraft: { paymentInReview: false } });
		expect(steps.map((s) => s.id)).toEqual(["menu", "whatsapp", "hours", "logo", "design", "publish"]);
		// Aunque haya pedidos guardados, mientras siga en vista previa falta publicarla.
		expect(steps.at(-1)).toMatchObject({
			title: "Publica tu tienda",
			done: false,
			target: "setup",
			setupStep: "publicar",
			actionLabel: "Publicar mi tienda",
		});
	});

	it("con el pago en revisión, publicar lleva a ver el estado", () => {
		const publish = buildFirstSteps({ ...base, storeDraft: { paymentInReview: true } }).at(-1)!;
		expect(publish).toMatchObject({ id: "publish", done: false, setupStep: "publicar", actionLabel: "Ver el estado" });
		expect(publish.detail).toContain("validando tu pago");
	});

	it("una tienda ya publicada vuelve a pedir el primer pedido", () => {
		const last = buildFirstSteps({ ...base, storeDraft: null }).at(-1)!;
		expect(last).toMatchObject({ id: "first_order", target: "store", actionLabel: "Ver mi tienda" });
	});
});
