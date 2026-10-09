import type { CompanySnapshot, MenuSetupSummary, StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import type { BusinessSector } from "@/lib/onboarding/business-sectors";
import type { BusinessHours, BusinessHoursWeek } from "@/lib/tenant/business-hours";

export type OwnerSetupBranch = {
	id: string;
	name: string;
	whatsappUrl: string | null;
	instagramUrl: string | null;
	address: string | null;
	schedule: string | null;
	businessHours: BusinessHours | null;
};

/** Lo que la página del servidor le pasa al asistente. */
export type OwnerSetupInitial = {
	company: Pick<CompanySnapshot, "id" | "name" | "publicSlug" | "customDomain" | "country">;
	sector: BusinessSector;
	/** Borrador del tema (o lo publicado si no hay borrador). */
	theme: StoreThemeConfig;
	/** URL firmada del logo del borrador, para mostrarlo y para la vista previa. */
	logoPreviewUrl: string | null;
	menuSetup: MenuSetupSummary;
	branch: OwnerSetupBranch | null;
	storeUrl: string;
	/** El dueño ya publicó alguna vez el tema desde /cuenta. */
	hasPublishedBefore: boolean;
	/**
	 * «Arma y paga»: la tienda está en vista previa. «Publicar mi tienda» guarda el diseño y
	 * lleva a elegir plan y pagar; con el comprobante en revisión, a ver el estado del pago.
	 */
	storeDraft?: { paymentInReview: boolean } | null;
	/** Vuelve del pago con la tienda recién abierta: arranca en la celebración con el QR. */
	justOpened?: boolean;
};

export type OwnerSetupMenuStatus = Pick<MenuSetupSummary, "productCount" | "sampleCount" | "categoryCount">;

/** El formulario del paso «Tu local». */
export type LocalForm = {
	whatsapp: string;
	instagram: string;
	address: string;
	hoursWeek: BusinessHoursWeek;
	hoursEnabled: boolean;
	/** El horario ya estaba guardado por días (si no, el editor muestra el texto viejo). */
	hoursStored: boolean;
	legacySchedule: string | null;
	legacyParsed: boolean;
	timeZone: string | null;
};
