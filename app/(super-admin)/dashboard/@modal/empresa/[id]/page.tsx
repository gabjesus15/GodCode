import { BranchesCreateForm } from "@/components/super-admin/branches/branches-create-form";
import { BranchesTable } from "@/components/super-admin/branches/branches-table";
import { CompanyDeleteButton } from "@/components/super-admin/companies/company-delete-button";
import { CompanyStatusToggle } from "@/components/super-admin/companies/company-status-toggle";
import { CompanyUberCredentialsForm } from "@/components/super-admin/companies/company-uber-credentials-form";
import { CompanyUserManagement } from "@/components/super-admin/companies/company-user-management";
import { CompanyBrandingSection, CompanyPanelAccessSection } from "@/components/super-admin/companies/detail/company-branding-section";
import { CompanyGeneralSection, CompanyPublicInfoSection } from "@/components/super-admin/companies/detail/company-data-sections";
import { CompanyEmailsSection } from "@/components/super-admin/companies/detail/company-emails-section";
import { CompanyEditProvider, SectionCard } from "@/components/super-admin/companies/detail/company-section";
import {
	CompanyExtendSection,
	CompanyPaymentsSection,
	CompanyPlanSection,
} from "@/components/super-admin/companies/detail/company-subscription-sections";
import { CompanyManageModal, type ManageModalHeader } from "@/components/super-admin/home/manage/company-manage-modal";
import { CompanyApplicationTab } from "@/components/super-admin/home/manage/application-manage-modal";
import { CancellationRequestPanel, RevertCancellationButton } from "@/components/super-admin/home/manage/cancellation-request-panel";
import { ManageActivity } from "@/components/super-admin/home/manage/manage-activity";
import { formatUsd } from "@/lib/billing/portal-pricing";
import { resolveSubscriptionPhase } from "@/lib/billing/portal-pricing";
import { fetchCancellationRequests } from "@/lib/super-admin/cancellation-requests";
import { loadCompanyDetail } from "@/lib/super-admin/company-detail";
import { detectPaymentMismatch, latestPaidByCompany } from "@/lib/super-admin/payment-mismatch";
import { DEMO_CANCEL_REASON, DEMO_DAYS_LEFT, demoEndsAt, demoRequestedAt, homeQuery, isDemoCompanyName, isHomeDemo } from "@/lib/super-admin/home-demo";
import { parseDashboardPeriod } from "@/lib/super-admin/super-admin-dashboard-shared";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";
import { getEffectiveCustomDomain } from "@/lib/tenant/tenant-effective-custom-domain";
import { getTenantHost } from "@/utils/tenant-url";

export const dynamic = "force-dynamic";

const dayFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago" });
const fmtDay = (iso: string | null | undefined) => (iso ? dayFmt.format(new Date(iso)).replace(/\./g, "") : "—");

/** Gestión completa de una empresa en ventana, encima del Inicio. */
export default async function CompanyManageModalPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ period?: string | string[]; simular?: string | string[] }>;
}) {
	await requireSuperAdminSession();
	const [{ id }, sp] = await Promise.all([params, searchParams]);
	const periodRaw = Array.isArray(sp.period) ? sp.period[0] : sp.period;
	const demo = isHomeDemo(sp.simular);
	const closeHref = `/dashboard${homeQuery({ period: periodRaw ? parseDashboardPeriod(periodRaw) : null, demo })}`;

	const detail = await loadCompanyDetail(id);
	if (detail.status !== "ok") {
		if (detail.status === "error") console.error("[super-admin/dashboard/empresa]", detail.error);
		return (
			<CompanyManageModal
				closeHref={closeHref}
				header={{
					id,
					name: detail.status === "not_found" ? "Empresa no encontrada" : "No se pudo cargar",
					host: "",
					publicSlug: null,
					logoUrl: null,
					status: { label: "Sin datos", variant: "neutral" },
					menuUrl: "",
					panelUrl: "",
					facts: [],
				}}
				tabs={[
					{
						id: "resumen",
						label: "Resumen",
						content: (
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								{detail.status === "not_found"
									? "Puede que la hayan eliminado. Cierra la ventana y recarga la lista."
									: "Recarga la página en unos segundos."}
							</p>
						),
					},
				]}
			/>
		);
	}

	const {
		company,
		createdAt,
		businessInfo,
		branches,
		plans,
		payments,
		plan,
		scheduledChange,
		deliveries,
		statusBadge,
		daysLeft,
		menuUrl,
		panelUrl,
		integ,
		allowTenantExternalDelivery,
		resolvedAssets,
	} = detail;

	const header: ManageModalHeader = {
		id: company.id,
		name: company.name ?? "Sin nombre",
		host: company.public_slug
			? getTenantHost(
					company.public_slug,
					getEffectiveCustomDomain(company.custom_domain, company.subscription_ends_at, company.subscription_status),
				)
			: "",
		publicSlug: company.public_slug,
		logoUrl: resolvedAssets.logoUrl || null,
		status: statusBadge,
		menuUrl,
		panelUrl,
		facts: [
			{ label: "Plan", value: plan?.name ?? "Sin plan", hint: plan ? `${formatUsd(plan.price)}/mes` : undefined },
			{
				label: "Vence",
				value: company.subscription_ends_at ? fmtDay(company.subscription_ends_at) : "Sin vencimiento",
				hint: company.subscription_ends_at
					? daysLeft == null
						? "Vencida"
						: daysLeft === 1
							? "Queda 1 día"
							: `Quedan ${daysLeft} días`
					: undefined,
				hintTone: daysLeft == null ? "danger" : daysLeft <= 7 ? "warning" : "muted",
			},
			{ label: "Cliente desde", value: fmtDay(createdAt) },
			{ label: "Sucursales", value: `${branches.filter((b) => b.is_active !== false).length} activas de ${branches.length}` },
		],
	};

	// Simulación: Oishi aparece pidiendo la baja (solo en pantalla).
	const demoCompany = demo && isDemoCompanyName(company.name);
	if (demoCompany) {
		header.status = { label: "Cancelada", variant: "warning" };
		header.facts[1] = { label: "Vence", value: fmtDay(demoEndsAt()), hint: `Quedan ${DEMO_DAYS_LEFT} días`, hintTone: "muted" };
	}

	// Baja pedida por el dueño: aviso con fecha y motivo encima de las pestañas.
	const cancelling = demoCompany || resolveSubscriptionPhase(company.subscription_status, company.subscription_ends_at) === "cancelling";
	const request = demoCompany
		? { reason: DEMO_CANCEL_REASON, requestedAt: demoRequestedAt() }
		: cancelling
			? ((await fetchCancellationRequests([company.id])).get(company.id) ?? { reason: null, requestedAt: null })
			: null;
	const reason = request?.reason ?? null;
	const onlineUntil = fmtDay(demoCompany ? demoEndsAt() : company.subscription_ends_at);
	const notice = cancelling
		? {
				kind: "cancellation" as const,
				title: demoCompany ? "Quiere darse de baja (simulación)" : "Quiere darse de baja",
				detail: `Sigue online hasta el ${onlineUntil}.${reason ? ` Motivo: ${reason}` : " No dejó motivo."} Revísala en la pestaña Solicitudes.`,
			}
		: null;

	// Si no pidió la baja: ¿su estado cuadra con los pagos? (antes, "Salud de pagos").
	const lastPaid = latestPaidByCompany(payments.map((p) => ({ company_id: company.id, status: p.status, payment_date: p.payment_date })));
	const mismatch = notice
		? null
		: detectPaymentMismatch({
				status: company.subscription_status,
				planPrice: plan?.price ?? null,
				endsAt: company.subscription_ends_at,
				lastPaidAt: lastPaid.has(company.id) ? lastPaid.get(company.id) : undefined,
			});
	const paymentNotice = mismatch
		? {
				kind: "payment" as const,
				title: mismatch.kind === "active_without_paid" ? "Activa sin pagos" : "Suspendida con pago reciente",
				detail:
					mismatch.kind === "active_without_paid"
						? "Tiene un plan de pago pero ningún pago confirmado. Revisa la pestaña Suscripción."
						: `Pagó el ${fmtDay(mismatch.paidAt)}. Quizás hay que reactivarla.`,
			}
		: null;

	const stack = "flex min-w-0 flex-col gap-4";

	return (
		<CompanyEditProvider companyId={company.id} initialUpdatedAt={company.updated_at}>
				<CompanyManageModal
					closeHref={closeHref}
					header={header}
					notice={notice ?? paymentNotice}
					actions={
						<>
							{cancelling ? (
								<RevertCancellationButton companyId={company.id} demo={demoCompany} />
							) : (
								<CompanyStatusToggle companyId={company.id} currentStatus={company.subscription_status} />
							)}
							<CompanyDeleteButton companyId={company.id} companyName={company.name} publicSlug={company.public_slug} />
						</>
					}
					tabs={[
						{
							id: "resumen",
							label: "Resumen",
							content: (
								<div className={stack}>
									<ManageActivity companyId={company.id} currency={company.currency} />
									<CompanyPaymentsSection payments={payments.slice(0, 5)} plans={plans} />
									<CompanyEmailsSection deliveries={deliveries} />
								</div>
							),
						},
						{
							id: "solicitudes",
							label: "Solicitudes",
							content: (
								<div className={stack}>
									{request ? (
										<CancellationRequestPanel
											companyId={company.id}
											requestedAt={request.requestedAt ? fmtDay(request.requestedAt) : "Sin registro"}
											onlineUntil={onlineUntil}
											reason={reason}
											demo={demoCompany}
										/>
									) : null}
									<CompanyApplicationTab companyId={company.id} demo={demoCompany} />
								</div>
							),
						},
						{
							id: "datos",
							label: "Datos",
							content: (
								<div className={stack}>
									<CompanyGeneralSection company={company} />
									<CompanyPublicInfoSection businessInfo={businessInfo} companyName={company.name ?? ""} />
								</div>
							),
						},
						{
							id: "suscripcion",
							label: "Suscripción",
							content: (
								<div className={stack}>
									<CompanyPlanSection company={company} plans={plans} scheduledChange={scheduledChange} />
									<CompanyExtendSection company={company} plans={plans} />
									<CompanyPaymentsSection payments={payments} plans={plans} />
								</div>
							),
						},
						{
							id: "marca",
							label: "Marca",
							content: (
								<div className={stack}>
									<CompanyBrandingSection
										company={company}
										previewUrls={{ logoUrl: resolvedAssets.logoUrl, backgroundImageUrl: resolvedAssets.backgroundImageUrl }}
									/>
									<CompanyPanelAccessSection company={company} plans={plans} />
								</div>
							),
						},
						{
							id: "sucursales",
							label: "Sucursales",
							content: (
								<div className={stack}>
									<SectionCard title="Nueva sucursal" description="Créala y actívala; el dueño la verá en su panel.">
										<BranchesCreateForm companyId={company.id} />
									</SectionCard>
									<BranchesTable branches={branches} />
								</div>
							),
						},
						{
							id: "usuarios",
							label: "Usuarios",
							content: (
								<SectionCard title="Usuarios y roles" description="Quién entra al panel de esta empresa y con qué permisos.">
									<CompanyUserManagement companyId={company.id} />
								</SectionCard>
							),
						},
						{
							id: "integraciones",
							label: "Integraciones",
							content: (
								<CompanyUberCredentialsForm
									companyId={company.id}
									initialClientId={integ.uber?.clientId ?? ""}
									initialCustomerId={integ.uber?.customerId ?? ""}
									hasClientSecret={Boolean(integ.uber?.clientSecretEncrypted)}
									initialAllowTenantExternalDelivery={allowTenantExternalDelivery}
								/>
							),
						},
					]}
				/>
		</CompanyEditProvider>
	);
}
