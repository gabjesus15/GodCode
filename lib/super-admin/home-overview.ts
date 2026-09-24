import "server-only";

import { remainingPaidDays, resolveSubscriptionPhase } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { maskEmail, maskPhone } from "@/lib/privacy/mask-contact";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { OPEN_TICKET_STATUSES, PENDING_APPLICATION_STATUSES } from "@/lib/status/status-labels";
import { fetchCancellationRequests } from "@/lib/super-admin/cancellation-requests";
import { demoApplication, DEMO_CANCEL_REASON, DEMO_DAYS_LEFT, demoEndsAt, homeQuery, isDemoCompanyName } from "@/lib/super-admin/home-demo";
import { detectPaymentMismatch, latestPaidByCompany, PAID_PAYMENT_STATUSES } from "@/lib/super-admin/payment-mismatch";
import { companySubscriptionStatus, onboardingStatus } from "@/lib/super-admin/status-maps";
import { type DashboardPeriod, DASHBOARD_PERIODS, periodStartIso } from "@/lib/super-admin/super-admin-dashboard-shared";
import { getEffectiveCustomDomain } from "@/lib/tenant/tenant-effective-custom-domain";
import { parseThemeLogoUrl } from "@/lib/tenant/tenant-favicon-utils";
import { getTenantHost, getTenantUrl } from "@/utils/tenant-url";

import { bucketEnds, countPerBucket, countSince, cumulativeAt } from "./home-overview-series";
import type { HomeCompanyGroup, HomeCompanyRow, HomeKpi, HomeOverview } from "./home-overview-types";

/** @service-role super-admin — llamar solo después de `requireSuperAdminSession()`. */

const DAY_MS = 86_400_000;
const EXPIRING_DAYS = 7;

type ApplicationQueryRow = {
	id: string;
	business_name: string | null;
	responsible_name: string | null;
	email: string | null;
	phone: string | null;
	status: string | null;
	payment_status: string | null;
	created_at: string | null;
	plan_id: string | null;
	custom_plan_name: string | null;
	company_id: string | null;
};

const dayFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", timeZone: "America/Santiago" });

type CompanyQueryRow = {
	id: string;
	name: string | null;
	email: string | null;
	phone: string | null;
	public_slug: string | null;
	custom_domain: string | null;
	subscription_status: string | null;
	subscription_ends_at: string | null;
	created_at: string | null;
	theme_config: unknown;
	plans: { name: string | null; price: number | null } | Array<{ name: string | null; price: number | null }> | null;
};

function toRow(company: CompanyQueryRow, now: Date): HomeCompanyRow {
	const plan = Array.isArray(company.plans) ? company.plans[0] : company.plans;
	const phase = resolveSubscriptionPhase(company.subscription_status, company.subscription_ends_at, now);
	const daysLeft = remainingPaidDays(company.subscription_ends_at, now);
	const group: HomeCompanyGroup =
		phase === "expired"
			? "churned"
			: phase === "payment_pending"
				? "pending"
				: phase === "cancelling"
					? "cancelling"
					: daysLeft != null && daysLeft <= EXPIRING_DAYS
						? "expiring"
						: "active";
	const status =
		phase === "expired" && company.subscription_status !== "suspended"
			? { label: "Vencida", variant: "danger" as const }
			: companySubscriptionStatus(company.subscription_status);
	const customDomain = getEffectiveCustomDomain(
		company.custom_domain,
		company.subscription_ends_at,
		company.subscription_status,
	);

	return {
		id: company.id,
		kind: "company",
		name: company.name ?? "Sin nombre",
		host: company.public_slug ? getTenantHost(company.public_slug, customDomain) : "",
		url: company.public_slug ? getTenantUrl(company.public_slug, customDomain) : "",
		logoUrl: null,
		emailMasked: maskEmail(company.email),
		whatsappMasked: maskPhone(company.phone),
		planName: plan?.name ?? null,
		status,
		group,
		endsAt: company.subscription_ends_at,
		daysLeft,
		createdAt: company.created_at,
		alert: null,
	};
}

function applicationToRow(app: ApplicationQueryRow, planName: string | null): HomeCompanyRow {
	const proofPending = app.payment_status === "pending_validation";
	return {
		id: app.id,
		kind: "application",
		name: app.business_name?.trim() || "Sin nombre",
		host: app.responsible_name?.trim() || "",
		url: "",
		logoUrl: null,
		emailMasked: maskEmail(app.email),
		whatsappMasked: maskPhone(app.phone),
		planName: planName ?? app.custom_plan_name ?? null,
		status: onboardingStatus(app.status),
		group: "application",
		endsAt: null,
		daysLeft: null,
		createdAt: app.created_at,
		alert: {
			kind: "application",
			title: proofPending ? "Solicitud de alta · comprobante por validar" : "Solicitud de alta",
			detail: `${onboardingStatus(app.status).label}. Llegó el ${app.created_at ? dayFmt.format(new Date(app.created_at)) : "—"}.`,
			href: `/dashboard/solicitud/${app.id}`,
			actionLabel: "Revisar",
		},
	};
}

export async function fetchHomeOverview(period: DashboardPeriod, options: { demo?: boolean } = {}): Promise<HomeOverview> {
	const now = new Date();
	const nowMs = now.getTime();
	const fromIso = periodStartIso(period);
	const fromMs = fromIso ? new Date(fromIso).getTime() : null;

	const [companiesRes, pendingAppsRes, appsRes, openTicketsRes, ticketsRes, pendingAppRowsRes, plansRes, paidRes] = await Promise.all([
		supabaseAdmin
			.from("companies")
			.select(
				"id,name,email,phone,public_slug,custom_domain,subscription_status,subscription_ends_at,created_at,theme_config,plans(name,price)",
			)
			.order("created_at", { ascending: false }),
		supabaseAdmin
			.from("onboarding_applications")
			.select("id", { count: "exact", head: true })
			.in("status", [...PENDING_APPLICATION_STATUSES]),
		(fromIso
			? supabaseAdmin.from("onboarding_applications").select("created_at").gte("created_at", fromIso)
			: supabaseAdmin.from("onboarding_applications").select("created_at")
		).limit(5000),
		supabaseAdmin
			.from("saas_tickets")
			.select("id", { count: "exact", head: true })
			.in("status", [...OPEN_TICKET_STATUSES]),
		(fromIso
			? supabaseAdmin.from("saas_tickets").select("created_at").gte("created_at", fromIso)
			: supabaseAdmin.from("saas_tickets").select("created_at")
		).limit(5000),
		supabaseAdmin
			.from("onboarding_applications")
			.select("id,business_name,responsible_name,email,phone,status,payment_status,created_at,plan_id,custom_plan_name,company_id")
			.in("status", [...PENDING_APPLICATION_STATUSES])
			.order("created_at", { ascending: false })
			.limit(50),
		supabaseAdmin.from("plans").select("id,name"),
		// Pagos cobrados, del más nuevo al más viejo: para ver si el estado cuadra con los pagos.
		supabaseAdmin
			.from("payments_history")
			.select("company_id,status,payment_date")
			.in("status", [...PAID_PAYMENT_STATUSES])
			.order("payment_date", { ascending: false, nullsFirst: false })
			.limit(5000),
	]);

	const error =
		companiesRes.error?.message ??
		pendingAppsRes.error?.message ??
		appsRes.error?.message ??
		openTicketsRes.error?.message ??
		ticketsRes.error?.message ??
		pendingAppRowsRes.error?.message ??
		paidRes.error?.message ??
		null;

	const companyRows = (companiesRes.data ?? []) as CompanyQueryRow[];
	// Los logos viven en Storage privado: se firman aquí (12 h) como en el portal de cada empresa.
	const logos = await Promise.all(
		companyRows.map((c) => createStorefrontAssetSignedUrl(parseThemeLogoUrl(c.theme_config), c.id).catch(() => "")),
	);
	const companies = companyRows.map((c, i) => ({ ...toRow(c, now), logoUrl: logos[i] || null }));

	// Bajas pedidas por el dueño: aviso con fecha y motivo, arriba de todo.
	const cancelling = companies.filter((c) => c.group === "cancelling");
	const requests = await fetchCancellationRequests(cancelling.map((c) => c.id));
	for (const c of cancelling) {
		const until = c.endsAt ? dayFmt.format(new Date(c.endsAt)) : "el vencimiento";
		const reason = requests.get(c.id)?.reason;
		c.alert = {
			kind: "cancellation",
			title: "Quiere darse de baja",
			detail: `Sigue online hasta el ${until}.${reason ? ` Motivo: ${reason}` : " No dejó motivo."}`,
			href: `/dashboard/empresa/${c.id}`,
			actionLabel: "Gestionar",
		};
	}

	// Estado que no cuadra con los pagos (antes, la página "Salud de pagos").
	const lastPaid = latestPaidByCompany(
		(paidRes.data ?? []) as Array<{ company_id: string | null; status: string | null; payment_date: string | null }>,
	);
	companyRows.forEach((raw, i) => {
		const row = companies[i];
		if (row.alert) return;
		const plan = Array.isArray(raw.plans) ? raw.plans[0] : raw.plans;
		const mismatch = detectPaymentMismatch({
			status: raw.subscription_status,
			planPrice: plan?.price ?? null,
			endsAt: raw.subscription_ends_at,
			lastPaidAt: lastPaid.has(raw.id) ? lastPaid.get(raw.id) : undefined,
			now,
		});
		if (!mismatch) return;
		row.alert =
			mismatch.kind === "active_without_paid"
				? {
						kind: "payment",
						title: "Activa sin pagos",
						detail: "Tiene un plan de pago pero ningún pago confirmado. Revisa su suscripción.",
						href: `/dashboard/empresa/${row.id}`,
						actionLabel: "Gestionar",
					}
				: {
						kind: "payment",
						title: "Suspendida con pago reciente",
						detail: `Pagó el ${dayFmt.format(new Date(mismatch.paidAt))}. Quizás hay que reactivarla.`,
						href: `/dashboard/empresa/${row.id}`,
						actionLabel: "Gestionar",
					};
	});

	const planNames = new Map(((plansRes.data ?? []) as Array<{ id: string; name: string | null }>).map((p) => [p.id, p.name]));
	const companyIds = new Set(companies.map((c) => c.id));
	const applicationRows: HomeCompanyRow[] = [];
	for (const app of (pendingAppRowsRes.data ?? []) as ApplicationQueryRow[]) {
		const row = applicationToRow(app, app.plan_id ? (planNames.get(app.plan_id) ?? null) : null);
		const company = app.company_id && companyIds.has(app.company_id) ? companies.find((c) => c.id === app.company_id) : null;
		// La empresa ya existe (p. ej. esperando validar el primer pago): el aviso va en su fila.
		if (company) {
			company.alert ??= row.alert;
			continue;
		}
		applicationRows.push(row);
	}
	const appDates = ((appsRes.data ?? []) as Array<{ created_at: string | null }>).map((r) => r.created_at);
	const ticketDates = ((ticketsRes.data ?? []) as Array<{ created_at: string | null }>).map((r) => r.created_at);

	// "Todo" arranca en la empresa más antigua; si no hay datos, un año atrás.
	const oldest = companies.reduce<number | null>((min, c) => {
		const ms = c.createdAt ? new Date(c.createdAt).getTime() : NaN;
		return Number.isFinite(ms) && (min == null || ms < min) ? ms : min;
	}, null);
	const startMs = fromMs ?? oldest ?? nowMs - 365 * DAY_MS;
	const ends = bucketEnds(startMs, nowMs, period === "7" ? 7 : 12);

	const online = companies.filter((c) => c.group !== "churned" && c.group !== "pending");
	const churned = companies.filter((c) => c.group === "churned");
	// Sin fecha de vencimiento la baja cuenta desde el inicio del gráfico.
	const churnDates = churned.map((c) => c.endsAt ?? new Date(startMs).toISOString());
	const periodLabel = (DASHBOARD_PERIODS.find((p) => p.value === period)?.label ?? "").toLowerCase();
	const inPeriod = period === "all" ? "en total" : `en ${periodLabel}`;
	const expiringCount = companies.filter((c) => c.group === "expiring").length;

	const kpis: HomeKpi[] = [
		{
			key: "active",
			label: "Empresas activas",
			value: online.length,
			delta: countSince(
				online.map((c) => c.createdAt),
				fromMs,
			),
			goodWhenUp: true,
			helper:
				expiringCount > 0
					? `${expiringCount} por vencer en ${EXPIRING_DAYS} días`
					: `de ${companies.length} ${companies.length === 1 ? "registrada" : "registradas"}`,
			series: cumulativeAt(
				online.map((c) => c.createdAt),
				ends,
			),
			href: null,
		},
		{
			key: "churned",
			label: "Dadas de baja",
			value: churned.length,
			delta: countSince(churnDates, fromMs),
			goodWhenUp: false,
			helper: "Vencidas, suspendidas o canceladas",
			series: cumulativeAt(churnDates, ends),
			href: null,
		},
		{
			key: "applications",
			label: "Solicitudes pendientes",
			value: pendingAppsRes.count ?? 0,
			delta: appDates.length,
			goodWhenUp: true,
			helper: `${appDates.length} ${appDates.length === 1 ? "recibida" : "recibidas"} ${inPeriod}`,
			series: countPerBucket(appDates, startMs, ends),
			href: null,
		},
		{
			key: "tickets",
			label: "Tickets abiertos",
			value: openTicketsRes.count ?? 0,
			delta: ticketDates.length,
			goodWhenUp: false,
			helper: `${ticketDates.length} ${ticketDates.length === 1 ? "nuevo" : "nuevos"} ${inPeriod}`,
			series: countPerBucket(ticketDates, startMs, ends),
			href: "/tickets",
		},
	];

	if (options.demo) applyDemo(companies, applicationRows, period, now);

	return { kpis, companies: [...companies, ...applicationRows], error };
}

/**
 * Simulación (`?simular=1`, nunca en producción): Oishi pide la baja y llega una solicitud de
 * ejemplo. Solo cambia lo que se pinta; la base no se toca.
 */
function applyDemo(companies: HomeCompanyRow[], applications: HomeCompanyRow[], period: DashboardPeriod, now: Date) {
	const query = homeQuery({ period, demo: true });
	const target = companies.find((c) => isDemoCompanyName(c.name));
	if (target) {
		const endsAt = demoEndsAt(now);
		target.group = "cancelling";
		target.status = { label: "Cancelada", variant: "warning" };
		target.endsAt = endsAt;
		target.daysLeft = DEMO_DAYS_LEFT;
		target.alert = {
			kind: "cancellation",
			title: "Quiere darse de baja",
			detail: `Sigue online hasta el ${dayFmt.format(new Date(endsAt))}. Motivo: ${DEMO_CANCEL_REASON}`,
			href: `/dashboard/empresa/${target.id}${query}`,
			actionLabel: "Gestionar",
		};
	}
	const demoRow = applicationToRow(
		{ ...demoApplication(now), phone: "+56 9 5555 0123", plan_id: null, custom_plan_name: null },
		"Avanzado",
	);
	if (demoRow.alert) demoRow.alert.href += query;
	applications.unshift(demoRow);
}
