import Link from "next/link";
import { Suspense } from "react";

import { TrafficView } from "@/components/super-admin/analytics/traffic-view";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import {
	adminSegmentedTabActive,
	adminSegmentedTabBase,
	adminSegmentedTabInactive,
	adminSegmentedTabList,
} from "@/components/super-admin/shell/admin-tab-styles";
import { parseDashboardPeriod } from "@/lib/super-admin/super-admin-dashboard-shared";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";
import { LandingAdminClientLazy } from "./landing-admin-client-lazy";

export const metadata = { title: "Landing y tráfico" };

export const dynamic = "force-dynamic";

type Tab = "trafico" | "editor";

const TABS: { value: Tab; label: string }[] = [
	{ value: "trafico", label: "Tráfico" },
	{ value: "editor", label: "Editor de la landing" },
];

function first(v: string | string[] | undefined): string | undefined {
	return Array.isArray(v) ? v[0] : v;
}

/** Antes eran dos páginas (Tráfico y Landing) que repetían las mismas cifras de visitas. */
export default async function LandingAndTrafficPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string | string[]; period?: string | string[]; company?: string | string[] }>;
}) {
	await requireSuperAdminSession();
	const sp = await searchParams;
	const tab: Tab = first(sp.tab) === "editor" ? "editor" : "trafico";
	const period = parseDashboardPeriod(first(sp.period));
	const companyId = first(sp.company)?.trim() ?? "";

	return (
		<div className="min-w-0 space-y-6">
			<SaasPageHeader
				title="Landing y tráfico"
				description="Visitas de la landing y de los menús, y las imágenes y el contacto de la landing pública."
			/>

			<nav aria-label="Secciones" className={adminSegmentedTabList}>
				{TABS.map((t) => (
					<Link
						key={t.value}
						href={t.value === "trafico" ? `/landing?period=${period}` : "/landing?tab=editor"}
						aria-current={tab === t.value ? "page" : undefined}
						className={`${adminSegmentedTabBase} ${tab === t.value ? adminSegmentedTabActive : adminSegmentedTabInactive}`}
					>
						{t.label}
					</Link>
				))}
			</nav>

			{tab === "trafico" ? (
				<Suspense
					key={`${period}:${companyId}`}
					fallback={
						<div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
							Cargando visitas…
						</div>
					}
				>
					<TrafficView period={period} companyId={companyId} />
				</Suspense>
			) : (
				<LandingAdminClientLazy />
			)}
		</div>
	);
}
