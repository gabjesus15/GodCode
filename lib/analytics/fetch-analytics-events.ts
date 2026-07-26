import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export type AnalyticsEventSelectRow = {
	created_at: string;
	page_type: "landing" | "tenant" | "saas" | "unknown";
	visitor_id: string | null;
	company_id: string | null;
	tenant_slug: string | null;
	country_code: string | null;
	event_name?: string | null;
};

type FetchParams = {
	fromIso?: string | null;
	pageTypes?: Array<"landing" | "tenant" | "saas" | "unknown">;
	companyId?: string | null;
	columns?: string;
	pageSize?: number;
	maxRows?: number;
};

/**
 * Trae analytics_events en páginas (PostgREST limita ~1000 filas por request).
 */
export async function fetchAnalyticsEventsPaged(
	params: FetchParams = {},
): Promise<{ rows: AnalyticsEventSelectRow[]; error: string | null }> {
	const pageSize = params.pageSize ?? 1000;
	const maxRows = params.maxRows ?? 50_000;
	const columns =
		params.columns ??
		"created_at,page_type,visitor_id,company_id,tenant_slug,country_code";

	const rows: AnalyticsEventSelectRow[] = [];
	let start = 0;

	while (rows.length < maxRows) {
		let q = supabaseAdmin
			.from("analytics_events")
			.select(columns)
			.order("created_at", { ascending: false })
			.range(start, start + pageSize - 1);

		if (params.fromIso) q = q.gte("created_at", params.fromIso);
		if (params.pageTypes?.length) q = q.in("page_type", params.pageTypes);
		if (params.companyId) q = q.eq("company_id", params.companyId);

		const { data, error } = await q;
		if (error) {
			return { rows, error: error.message };
		}

		const batch = (data ?? []) as unknown as AnalyticsEventSelectRow[];
		if (batch.length === 0) break;
		rows.push(...batch);
		if (batch.length < pageSize) break;
		start += pageSize;
	}

	return { rows, error: null };
}
