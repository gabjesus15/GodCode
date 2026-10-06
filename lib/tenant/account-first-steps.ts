import { normalizeBusinessHours } from "./business-hours";

/**
 * «Primeros pasos» del Resumen de /cuenta: lo que le falta a la tienda para vender,
 * calculado de los datos reales. Cada paso lleva a la sección donde se resuelve y la
 * tarjeta desaparece cuando están todos hechos.
 */

export type FirstStepId = "menu" | "whatsapp" | "hours" | "logo" | "first_order";

export type FirstStep = {
	id: FirstStepId;
	title: string;
	detail: string;
	done: boolean;
	/** Sección de /cuenta que lo resuelve; `store` abre la tienda pública. */
	target: "menu" | "perfil" | "tienda" | "store";
	actionLabel: string;
};

export type FirstStepsInput = {
	productCount: number;
	sampleCount: number;
	branches: Array<{ whatsapp_url?: string | null; business_hours?: unknown; schedule?: string | null }>;
	logoUrl: string | null;
	orderCount: number;
};

export function buildFirstSteps(input: FirstStepsInput): FirstStep[] {
	const realProducts = Math.max(0, input.productCount - input.sampleCount);
	const hasWhatsapp = input.branches.some((b) => String(b.whatsapp_url ?? "").trim());
	const hasHours = input.branches.some((b) => normalizeBusinessHours(b.business_hours) != null || String(b.schedule ?? "").trim());

	return [
		{
			id: "menu",
			title: "Carga tu menú",
			detail:
				realProducts > 0
					? `${realProducts} ${realProducts === 1 ? "producto" : "productos"} en tu tienda.`
					: input.sampleCount > 0
						? `Tienes ${input.sampleCount} productos de ejemplo: cámbialos por los tuyos.`
						: "Súbelo desde una foto o un Excel, o empieza con un ejemplo.",
			done: realProducts > 0,
			target: "menu",
			actionLabel: input.sampleCount > 0 ? "Revisar mi menú" : "Cargar mi menú",
		},
		{
			id: "whatsapp",
			title: "Agrega tu WhatsApp",
			detail: "Para que tus clientes te escriban y te lleguen los pedidos.",
			done: hasWhatsapp,
			target: "perfil",
			actionLabel: "Agregar WhatsApp",
		},
		{
			id: "hours",
			title: "Carga tu horario",
			detail: "La tienda avisa sola cuando estás cerrado.",
			done: hasHours,
			target: "perfil",
			actionLabel: "Cargar horario",
		},
		{
			id: "logo",
			title: "Sube tu logo",
			detail: "Aparece en tu tienda y en tu página de inicio.",
			done: Boolean(input.logoUrl?.trim()),
			target: "tienda",
			actionLabel: "Subir logo",
		},
		{
			id: "first_order",
			title: "Recibe tu primer pedido",
			detail: "Comparte el enlace de tu tienda en tu Instagram y tu WhatsApp.",
			done: input.orderCount > 0,
			target: "store",
			actionLabel: "Ver mi tienda",
		},
	];
}
