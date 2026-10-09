import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OwnerSetupWizard } from "@/components/customer-portal/setup/owner-setup-wizard";
import type { OwnerSetupInitial } from "@/components/customer-portal/setup/owner-setup-types";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isMenuImportEnabled } from "@/lib/menu/ai-menu-import";
import { getMenuStatus } from "@/lib/menu/create-menu-items";
import { resolveBusinessSector } from "@/lib/onboarding/business-sectors";
import { companyHasPublicMenu } from "@/lib/plans/plan-product-mode";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { normalizeBusinessHours } from "@/lib/tenant/business-hours";
import { requireCustomerPortalSession } from "@/lib/tenant/customer-portal-session";
import { OWNER_SETUP_STEPS, type OwnerSetupStep } from "@/lib/tenant/owner-setup";
import { isStoreDraftPending, readStoreDraft } from "@/lib/tenant/store-draft";
import { getTenantMenuUrl } from "@/utils/tenant-url";

/** @service-role tenant-session
 *
 * requireCustomerPortalSession → getCustomerMembership fija el company_id (solo el CEO entra a /cuenta).
 */

export const metadata: Metadata = { title: "Configura tu tienda" };
export const dynamic = "force-dynamic";

/** `/cuenta/configurar?paso=menu`: «Primeros pasos» abre el asistente en el paso que falta. */
function parseStep(raw: string | string[] | undefined): OwnerSetupStep {
	const value = Array.isArray(raw) ? raw[0] : raw;
	return OWNER_SETUP_STEPS.find((step) => step === value) ?? "marca";
}

export default async function OwnerSetupPage({ searchParams }: { searchParams: Promise<{ paso?: string | string[]; abierta?: string | string[] }> }) {
	const params = await searchParams;
	const initialStep = parseStep(params?.paso);
	const { membership } = await requireCustomerPortalSession();
	const companyId = membership.companyId;

	const [{ data: company }, { data: draft }, { data: branch }, { data: application }, menuStatus, { count: versionCount }] =
		await Promise.all([
			supabaseAdmin
				.from("companies")
				.select("id,name,public_slug,custom_domain,country,subscription_status,theme_config,plan:plans(features)")
				.eq("id", companyId)
				.maybeSingle(),
			supabaseAdmin.from("company_theme_drafts").select("theme_config").eq("company_id", companyId).maybeSingle(),
			// La sucursal principal es la primera que se creó (la del alta).
			supabaseAdmin
				.from("branches")
				.select("id,name,address,schedule,business_hours,whatsapp_url,instagram_url")
				.eq("company_id", companyId)
				.order("created_at", { ascending: true })
				.limit(1)
				.maybeSingle(),
			supabaseAdmin
				.from("onboarding_applications")
				.select("sector,payment_status,payment_reference_url")
				.eq("company_id", companyId)
				.order("created_at", { ascending: false })
				.limit(1)
				.maybeSingle(),
			getMenuStatus(supabaseAdmin, companyId),
			supabaseAdmin.from("company_theme_versions").select("id", { count: "exact", head: true }).eq("company_id", companyId),
		]);

	// «Solo panel CEO» no tiene tienda pública que armar: su cuenta es el resumen y el panel.
	if (company && !companyHasPublicMenu({ plans: company.plan })) redirect("/cuenta");

	const name = String(company?.name ?? "Mi tienda");
	const publicSlug = (company?.public_slug as string | null) ?? null;
	const customDomain = (company?.custom_domain as string | null) ?? null;
	const theme = normalizeStoreThemeConfig(draft?.theme_config ?? company?.theme_config ?? null, name);
	const app = application as { sector?: string | null; payment_status?: string | null; payment_reference_url?: string | null } | null;
	const sector = app?.sector ?? null;
	// «Arma y paga»: en vista previa, publicar lleva a pagar; al volver del pago, la celebración.
	const storeDraft = isStoreDraftPending(company)
		? { paymentInReview: app?.payment_status === "pending_validation" && Boolean(String(app?.payment_reference_url ?? "").trim()) }
		: null;
	const abierta = Array.isArray(params?.abierta) ? params.abierta[0] : params?.abierta;
	const justOpened = !storeDraft && abierta === "1" && Boolean(readStoreDraft(company?.theme_config)?.openedAt);

	const initial: OwnerSetupInitial = {
		company: {
			id: companyId,
			name,
			publicSlug,
			customDomain,
			country: (company?.country as string | null) ?? null,
		},
		sector: resolveBusinessSector(sector),
		theme,
		logoPreviewUrl: (await createStorefrontAssetSignedUrl(theme.logoUrl, companyId)) || null,
		menuSetup: { ...menuStatus, importEnabled: isMenuImportEnabled(), sector },
		branch: branch
			? {
					id: String(branch.id),
					name: String(branch.name ?? ""),
					whatsappUrl: (branch.whatsapp_url as string | null) ?? null,
					instagramUrl: (branch.instagram_url as string | null) ?? null,
					address: (branch.address as string | null) ?? null,
					schedule: (branch.schedule as string | null) ?? null,
					businessHours: normalizeBusinessHours(branch.business_hours),
				}
			: null,
		storeUrl: publicSlug ? getTenantMenuUrl(publicSlug, customDomain) : "",
		hasPublishedBefore: (versionCount ?? 0) > 0,
		storeDraft,
		justOpened,
	};

	return <OwnerSetupWizard initial={initial} initialStep={justOpened ? "publicar" : initialStep} />;
}
