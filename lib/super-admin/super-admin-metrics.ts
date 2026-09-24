import { supabaseAdmin } from "../infra/supabase-admin";

export type { DashboardPeriod } from "./super-admin-dashboard-shared";
export { DASHBOARD_PERIODS, periodStartIso } from "./super-admin-dashboard-shared";


const ONBOARDING_STATUSES = [
	"pending_verification",
	"email_verified",
	"form_completed",
	"payment_pending",
	"payment_validated",
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
	const onboardingEvents: { visitor_id: string | null; path: string | null }[] = [];
	let start = 0;
	const step = 1000;
	let keepFetching = true;
	let viewsError: Error | null = null;
	let totalFetched = 0;

	while (keepFetching) {
		let q = supabaseAdmin
			.from("analytics_events")
			.select("visitor_id, path")
			.ilike("path", "/onboarding%")
			.order("created_at", { ascending: false })
			.range(start, start + step - 1);

		if (fromIso) {
			q = q.gte("created_at", fromIso);
		}

		const { data, error } = await q;
		if (error) {
			viewsError = error;
			break;
		}

		if (data && data.length > 0) {
			totalFetched += data.length;
			const filtered = data.filter((e) => {
				const clean = (e.path || "").split("?")[0].replace(/\/$/, "");
				return clean === "/onboarding";
			});
			onboardingEvents.push(...filtered);

			if (data.length < step || totalFetched >= 50000) {
				keepFetching = false;
			} else {
				start += step;
			}
		} else {
			keepFetching = false;
		}
	}

	if (viewsError) {
		return { counts, total, onboardingViews: 0, onboardingVisitors: 0, error: viewsError.message };
	}

	const onboardingVisitors = new Set(onboardingEvents.map((e) => e.visitor_id).filter(Boolean)).size;
	const onboardingViews = onboardingEvents.length;

	return { counts, total, onboardingViews, onboardingVisitors, error: null };
}
