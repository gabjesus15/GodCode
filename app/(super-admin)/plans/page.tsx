import { PlansAdminClientLazy } from "./plans-admin-client-lazy";

import { queryAdminPlansList } from "@/lib/plans/plans-db-query";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const getUsdToClp = async () => {
	try {
		const res = await fetch("https://open.er-api.com/v6/latest/USD", {
			next: { revalidate: 43200 },
		});
		if (!res.ok) return null;
		const data = await res.json();
		const rate = Number(data?.rates?.CLP ?? 0);
		return rate > 0 ? rate : null;
	} catch {
		return null;
	}
};

export default async function PlansPage() {
	try {
		const [rate, plansResult, addonsResult] = await Promise.all([
			getUsdToClp(),
			queryAdminPlansList(),
			supabaseAdmin
				.from("addons")
				.select("id,slug,name")
				.eq("is_active", true)
				.order("sort_order", { ascending: true }),
		]);
		const { data, error } = plansResult;
		const { data: addons, error: addonsError } = addonsResult;

		if (error) {
			console.error("[plans/page] DB:", error.message);
			throw error;
		}
		if (addonsError) {
			console.error("[plans/page] addons DB:", addonsError.message);
			throw addonsError;
		}

		return (
			<PlansAdminClientLazy
				plans={data ?? []}
				rate={rate}
				addons={(addons ?? []) as Array<{ id: string; slug: string | null; name: string }>}
			/>
		);
	} catch (err) {
		console.error("[plans/page]", err);
		return (
			<div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
				No se pudo cargar el listado de planes.
			</div>
		);
	}
}
