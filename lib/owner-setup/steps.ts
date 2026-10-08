import { OWNER_SETUP_STEPS, type OwnerSetupStep } from "@/lib/tenant/owner-setup";

export { OWNER_SETUP_STEPS, type OwnerSetupStep };

export type OwnerSetupStepMeta = {
	/** Nombre corto, para la barra de progreso. */
	label: string;
	title: string;
	description: string;
};

/** Textos de cada paso. Viven aquí y no en la pantalla para que una app use los mismos. */
export const OWNER_SETUP_STEP_META: Record<OwnerSetupStep, OwnerSetupStepMeta> = {
	marca: {
		label: "Tu marca",
		title: "Empecemos por tu marca",
		description: "Tu logo y tu nombre van arriba en el menú. Con el logo te proponemos los colores.",
	},
	diseno: {
		label: "Diseño",
		title: "Elige cómo se ve tu menú",
		description: "Toca un diseño y míralo en el teléfono con tu logo. Lo puedes cambiar cuando quieras.",
	},
	menu: {
		label: "Tu menú",
		title: "Carga tus productos",
		description: "Sube tu carta y la leemos por ti, o empieza con un ejemplo y cámbialo después.",
	},
	local: {
		label: "Tu local",
		title: "¿Dónde y cuándo te encuentran?",
		description: "Salen en tu menú para que te escriban, te sigan y sepan cuándo abres.",
	},
	publicar: {
		label: "Publicar",
		title: "Todo listo para salir",
		description: "Al publicar, tus clientes ven tu menú con este diseño en tu dirección.",
	},
};

/** El paso «Publicar» de una tienda en vista previa («Arma y paga»): publicar es pagar. */
export const OWNER_SETUP_DRAFT_PUBLISH_META = {
	title: "Elige tu plan para abrir tu tienda",
	description: "Tu tienda ya está armada y solo tú la ves. Al publicar eliges tu plan y pagas; se abre a tus clientes apenas se confirme el pago.",
	reviewTitle: "Validando tu pago",
	reviewDescription: "Tu tienda se publica sola apenas confirmemos el pago. Mientras tanto puedes seguir ajustándola.",
} as const;

export function ownerSetupStepIndex(step: OwnerSetupStep): number {
	return OWNER_SETUP_STEPS.indexOf(step);
}

export function nextOwnerSetupStep(step: OwnerSetupStep): OwnerSetupStep | null {
	return OWNER_SETUP_STEPS[ownerSetupStepIndex(step) + 1] ?? null;
}

export function previousOwnerSetupStep(step: OwnerSetupStep): OwnerSetupStep | null {
	return OWNER_SETUP_STEPS[ownerSetupStepIndex(step) - 1] ?? null;
}
