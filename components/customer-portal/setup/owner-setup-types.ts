import type { CompanySnapshot, MenuSetupSummary, StoreThemeConfig } from "../shared/customer-account-types";

import type { BusinessSector } from "@/lib/onboarding/business-sectors";
import type { BusinessHours } from "@/lib/tenant/business-hours";

export type OwnerSetupBranch = {
	id: string;
	name: string;
	whatsappUrl: string | null;
	instagramUrl: string | null;
	address: string | null;
	schedule: string | null;
	businessHours: BusinessHours | null;
};

export type OwnerSetupInitial = {
	company: Pick<CompanySnapshot, "id" | "name" | "publicSlug" | "customDomain" | "country" | "tenantAdminUrl">;
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
};
