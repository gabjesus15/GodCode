import { normalizeBusinessHours } from "./business-hours";
import type { OwnerSetupStep } from "./owner-setup";

/**
 * «Primeros pasos» del Resumen de /cuenta: lo que le falta a la tienda para vender,
 * calculado de los datos reales. Cada paso lleva a la sección donde se resuelve y la
 * tarjeta desaparece cuando están todos hechos.
 */

type FirstStepId = "menu" | "whatsapp" | "hours" | "logo" | "design" | "first_order" | "publish";

export type FirstStep = {
	id: FirstStepId;
	title: string;
	detail: string;
	done: boolean;
	/** Sección de /cuenta que lo resuelve; `store` abre la tienda pública y `setup`, «Configura tu tienda». */
	target: "menu" | "perfil" | "tienda" | "store" | "setup";
	/** Paso de «Configura tu tienda» en el que se abre (con `target: "setup"`). */
	setupStep?: OwnerSetupStep;
	actionLabel: string;
};

type FirstStepsInput = {
	productCount: number;
	sampleCount: number;
	branches: Array<{ whatsapp_url?: string | null; business_hours?: unknown; schedule?: string | null }>;
	logoUrl: string | null;
	orderCount: number;
	/** Plantilla de menú elegida (`theme_config.templateId`). */
	templateId?: string | null;
	/** Terminó «Configura tu tienda». */
	setupFinished?: boolean;
	/** «Arma y paga»: la tienda sigue en vista previa (`theme_config.storeDraft` sin `openedAt`). */
	storeDraft?: { paymentInReview: boolean } | null;
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
			target: "setup",
			setupStep: "local",
			actionLabel: "Agregar WhatsApp",
		},
		{
			id: "hours",
			title: "Carga tu horario",
			detail: "La tienda avisa sola cuando estás cerrado.",
			done: hasHours,
			target: "setup",
			setupStep: "local",
			actionLabel: "Cargar horario",
		},
		{
			id: "logo",
			title: "Sube tu logo",
			detail: "Aparece en tu tienda y en tu página de inicio.",
			done: Boolean(input.logoUrl?.trim()),
			target: "setup",
			setupStep: "marca",
			actionLabel: "Subir logo",
		},
		{
			id: "design",
			title: "Elige cómo se ve tu menú",
			detail: "Diseños pensados para tu tipo de negocio, con tu logo y tus colores.",
			done: Boolean(input.templateId?.trim()) || input.setupFinished === true,
			target: "setup",
			setupStep: "diseno",
			actionLabel: "Elegir diseño",
		},
		// En vista previa solo el dueño ve la tienda: compartir el enlace no trae pedidos. El
		// paso que falta es publicarla, desde el paso «Publicar» del asistente (de ahí va a
		// `/cuenta/publicar`, a elegir el plan y pagar).
		input.storeDraft
			? {
					id: "publish",
					title: "Publica tu tienda",
					detail: input.storeDraft.paymentInReview
						? "Estamos validando tu pago. Se publica sola al confirmarlo."
						: "Tus clientes todavía no la ven. Eliges tu plan y pagas.",
					done: false,
					target: "setup",
					setupStep: "publicar",
					actionLabel: input.storeDraft.paymentInReview ? "Ver el estado" : "Publicar mi tienda",
				}
			: {
					id: "first_order",
					title: "Recibe tu primer pedido",
					detail: "Comparte el enlace de tu tienda en tu Instagram y tu WhatsApp.",
					done: input.orderCount > 0,
					target: "store",
					actionLabel: "Ver mi tienda",
				},
	];
}
