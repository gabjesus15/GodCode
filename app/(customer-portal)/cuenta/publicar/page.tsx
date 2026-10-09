import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { requireCustomerPortalSession } from "@/lib/tenant/customer-portal-session";
import { isStoreDraftPending } from "@/lib/tenant/store-draft";

/** @service-role tenant-session
 *
 * requireCustomerPortalSession → getCustomerMembership fija el company_id; solo se lee la
 * solicitud de alta de esa empresa.
 */

export const dynamic = "force-dynamic";

/**
 * «Publicar mi tienda» desde la vista previa: lleva a elegir el plan (con el que trajo del
 * landing ya marcado) y pagar, con el enlace de su propia solicitud de alta. Si el pago ya
 * está en revisión, al estado del pago; si la tienda ya está abierta, de vuelta al asistente.
 */
export default async function PublishStorePage() {
	const { membership } = await requireCustomerPortalSession();

	const [{ data: company }, { data: application }] = await Promise.all([
		supabaseAdmin.from("companies").select("subscription_status,theme_config").eq("id", membership.companyId).maybeSingle(),
		supabaseAdmin
			.from("onboarding_applications")
			.select("verification_token,status,payment_status,payment_reference_url")
			.eq("company_id", membership.companyId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle(),
	]);

	if (!isStoreDraftPending(company)) redirect("/cuenta/configurar?paso=publicar");

	const token = String(application?.verification_token ?? "").trim();
	// Sin solicitud (una tienda creada por el equipo, por ejemplo) no hay alta que retomar.
	if (!token) redirect("/cuenta?tab=facturacion");

	const encoded = encodeURIComponent(token);
	const inReview = application?.payment_status === "pending_validation" && Boolean(String(application?.payment_reference_url ?? "").trim());
	redirect(inReview ? `/onboarding/pago?token=${encoded}` : `/onboarding/complete?token=${encoded}`);
}
