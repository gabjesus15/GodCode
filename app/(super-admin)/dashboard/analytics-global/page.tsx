import { redirect } from "next/navigation";

/** Tráfico ahora es una pestaña de "Landing y tráfico". */
export default async function AnalyticsGlobalRedirect({
	searchParams,
}: {
	searchParams: Promise<{ period?: string | string[]; company?: string | string[] }>;
}) {
	const sp = await searchParams;
	const qs = new URLSearchParams();
	for (const key of ["period", "company"] as const) {
		const v = Array.isArray(sp[key]) ? sp[key][0] : sp[key];
		if (v) qs.set(key, v);
	}
	const query = qs.toString();
	redirect(query ? `/landing?${query}` : "/landing");
}
