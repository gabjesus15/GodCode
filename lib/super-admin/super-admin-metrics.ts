import { supabaseAdmin } from "../infra/supabase-admin";

export type { DashboardPeriod } from "./super-admin-dashboard-shared";
export { DASHBOARD_PERIODS, periodStartIso } from "./super-admin-dashboard-shared";

function isPaidStatus(s: string | null | undefined): boolean {
	const t = String(s ?? "").toLowerCase();
	return t === "paid" || t === "approved";
}

/** MRR aproximado: suma del precio mensual del plan de empresas activas (sin add-ons recurrentes). */
export async function fetchMrrFromPlans(): Promise<{ mrr: number; activeWithPlan: number; error: string | null }> {
	const { data, error } = await supabaseAdmin
		.from("companies")
		.select("id, plan_id, plans(price)")
		.eq("subscription_status", "active")
		.limit(10000);

	if (error) {
		return { mrr: 0, activeWithPlan: 0, error: error.message };
	}

	let mrr = 0;
	let activeWithPlan = 0;
	for (const row of data ?? []) {
		const rawPlan = row.plans as unknown;
		const planObj = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
		const plan = planObj as { price?: number | null } | null | undefined;
		const price = plan?.price != null ? Number(plan.price) : 0;
		if (row.plan_id && Number.isFinite(price) && price > 0) {
			activeWithPlan += 1;
			mrr += price;
		}
	}
	return { mrr: Math.round(mrr), activeWithPlan, error: null };
}

/** Ingresos reconocidos por pagos en el periodo (amount_paid con estado pagado). */
export async function fetchRevenueInPeriod(fromIso: string | null): Promise<{
	total: number;
	count: number;
	error: string | null;
}> {
	let q = supabaseAdmin
		.from("payments_history")
		.select("amount_paid, status, payment_date")
		.in("status", ["paid", "approved"])
		.limit(20000);

	if (fromIso) {
		q = q.gte("payment_date", fromIso);
	}

	const { data, error } = await q;
	if (error) {
		return { total: 0, count: 0, error: error.message };
	}
	let total = 0;
	for (const p of data ?? []) {
		if (!isPaidStatus(p.status)) continue;
		total += Number(p.amount_paid) || 0;
	}
	return { total: Math.round(total), count: data?.length ?? 0, error: null };
}

export async function fetchNewCompaniesInPeriod(fromIso: string | null): Promise<{
	count: number;
	error: string | null;
}> {
	let q = supabaseAdmin.from("companies").select("id", { count: "exact", head: true });
	if (fromIso) {
		q = q.gte("created_at", fromIso);
	}
	const { count, error } = await q;
	if (error) {
		return { count: 0, error: error.message };
	}
	return { count: count ?? 0, error: null };
}

const ONBOARDING_STATUSES = [
	"pending_verification",
	"email_verified",
	"form_completed",
	"payment_pending",
	"active",
	"rejected",
] as const;

export async function fetchOnboardingFunnelCounts(fromIso: string | null): Promise<{
	counts: Record<string, number>;
	total: number;
	onboardingViews: number;
	onboardingVisitors: number;
	error: string | null;
}> {
	const results = await Promise.all(
		ONBOARDING_STATUSES.map(async (status) => {
			let q = supabaseAdmin
				.from("onboarding_applications")
				.select("id", { count: "exact", head: true })
				.eq("status", status);
			if (fromIso) {
				q = q.gte("created_at", fromIso);
			}
			const { count, error } = await q;
			return { status, count: count ?? 0, error: error?.message ?? null };
		})
	);

	const err = results.find((r) => r.error);
	if (err?.error) {
		return { counts: {}, total: 0, onboardingViews: 0, onboardingVisitors: 0, error: err.error };
	}

	const counts: Record<string, number> = {};
	let total = 0;
	for (const r of results) {
		counts[r.status] = r.count;
		total += r.count;
	}

	let totalQuery = supabaseAdmin
		.from("onboarding_applications")
		.select("id", { count: "exact", head: true });
	if (fromIso) {
		totalQuery = totalQuery.gte("created_at", fromIso);
	}
	const { count: rowTotal, error: totalErr } = await totalQuery;
	if (totalErr) {
		return { counts, total, onboardingViews: 0, onboardingVisitors: 0, error: totalErr.message };
	}
	const accounted = total;
	const other = Math.max(0, (rowTotal ?? 0) - accounted);
	if (other > 0) {
		counts.other = other;
		total = rowTotal ?? accounted;
	}

	// Paso 0: Visitas de onboarding (analytics_events)
	let viewsQuery = supabaseAdmin
		.from("analytics_events")
		.select("visitor_id, path")
		.ilike("path", "/onboarding%")
		.limit(50000);
	if (fromIso) {
		viewsQuery = viewsQuery.gte("created_at", fromIso);
	}
	const { data: viewsData, error: viewsError } = await viewsQuery;
	if (viewsError) {
		return { counts, total, onboardingViews: 0, onboardingVisitors: 0, error: viewsError.message };
	}

	const onboardingEvents = (viewsData ?? []).filter((e) => {
		const clean = (e.path || "").split("?")[0].replace(/\/$/, "");
		return clean === "/onboarding";
	});
	const onboardingVisitors = new Set(onboardingEvents.map((e) => e.visitor_id).filter(Boolean)).size;
	const onboardingViews = onboardingEvents.length;

	return { counts, total, onboardingViews, onboardingVisitors, error: null };
}

export type PaymentHealthRow = {
	type: "active_without_paid_payment" | "suspended_with_recent_paid";
	company_id: string;
	company_name: string;
	subscription_status: string | null;
	last_payment_status: string | null;
	last_payment_date: string | null;
};

/** Alertas: activa sin último pago pagado; suspendida con pago reciente (referencia). */
export async function fetchPaymentHealthRows(limit = 40): Promise<{
	rows: PaymentHealthRow[];
	error: string | null;
}> {
	const [{ data: companies, error: cErr }, { data: payments, error: pErr }] = await Promise.all([
		supabaseAdmin
			.from("companies")
			.select("id, name, subscription_status")
			.in("subscription_status", ["active", "suspended"])
			.limit(500),
		supabaseAdmin
			.from("payments_history")
			.select("company_id, status, payment_date, amount_paid")
			.order("payment_date", { ascending: false })
			.limit(2000),
	]);

	if (cErr) return { rows: [], error: cErr.message };
	if (pErr) return { rows: [], error: pErr.message };

	const latestByCompany = new Map<
		string,
		{ status: string | null; payment_date: string | null }
	>();
	for (const pay of payments ?? []) {
		const cid = pay.company_id;
		if (!cid || latestByCompany.has(cid)) continue;
		latestByCompany.set(cid, {
			status: pay.status ?? null,
			payment_date: pay.payment_date ?? null,
		});
	}

	const rows: PaymentHealthRow[] = [];
	const now = Date.now();
	const recentMs = 90 * 24 * 60 * 60 * 1000;

	for (const c of companies ?? []) {
		const st = String(c.subscription_status ?? "");
		const last = latestByCompany.get(c.id);
		if (st === "active") {
			if (!last || !isPaidStatus(last.status)) {
				rows.push({
					type: "active_without_paid_payment",
					company_id: c.id,
					company_name: c.name ?? "—",
					subscription_status: c.subscription_status,
					last_payment_status: last?.status ?? null,
					last_payment_date: last?.payment_date ?? null,
				});
			}
		} else if (st === "suspended" && last && isPaidStatus(last.status) && last.payment_date) {
			const t = new Date(last.payment_date).getTime();
			if (Number.isFinite(t) && now - t < recentMs) {
				rows.push({
					type: "suspended_with_recent_paid",
					company_id: c.id,
					company_name: c.name ?? "—",
					subscription_status: c.subscription_status,
					last_payment_status: last.status,
					last_payment_date: last.payment_date,
				});
			}
		}
		if (rows.length >= limit) {
			break;
		}
	}

	return { rows, error: null };
}

export async function fetchCompanyStatusCounts(): Promise<{
	active: number;
	suspended: number;
	error: string | null;
}> {
	const [a, s] = await Promise.all([
		supabaseAdmin
			.from("companies")
			.select("id", { count: "exact", head: true })
			.eq("subscription_status", "active"),
		supabaseAdmin
			.from("companies")
			.select("id", { count: "exact", head: true })
			.eq("subscription_status", "suspended"),
	]);
	const err = a.error?.message ?? s.error?.message ?? null;
	if (err) {
		return { active: 0, suspended: 0, error: err };
	}
	return { active: a.count ?? 0, suspended: s.count ?? 0, error: null };
}

export async function fetchOpenTicketsCount(): Promise<{ count: number; error: string | null }> {
	const { count, error } = await supabaseAdmin
		.from("saas_tickets")
		.select("id", { count: "exact", head: true })
		.is("resolved_at", null);

	if (error) {
		return { count: 0, error: error.message };
	}
	return { count: count ?? 0, error: null };
}
