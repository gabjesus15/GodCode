import { OWNER_SETUP_STEPS, type OwnerSetupStep } from "./steps";

type OwnerSetupProgressInput = {
	/** Logo guardado en el borrador (ruta de storage, no la URL firmada). */
	logoUrl: string;
	templateId: string | null | undefined;
	productCount: number;
	/** WhatsApp ya convertido a URL válida; `null` si falta o está mal escrito. */
	whatsappUrl: string | null;
	address: string;
	published: boolean;
};

/** Qué pasos están completos, según los datos reales y no un contador aparte. */
export function ownerSetupStepDone(input: OwnerSetupProgressInput): Record<OwnerSetupStep, boolean> {
	return {
		marca: Boolean(input.logoUrl.trim()),
		diseno: Boolean(input.templateId),
		menu: input.productCount > 0,
		local: Boolean(input.whatsappUrl && input.address.trim()),
		publicar: input.published,
	};
}

/** Avance de 0 a 1 entre los pasos que se pueden completar antes de publicar. */
export function ownerSetupCompletion(done: Record<OwnerSetupStep, boolean>): number {
	const steps = OWNER_SETUP_STEPS.filter((step) => step !== "publicar");
	return steps.filter((step) => done[step]).length / steps.length;
}
