import { NewHomeView } from "@/components/super-admin/home/new-home-view";
import { isHomeDemo } from "@/lib/super-admin/home-demo";
import { parseDashboardPeriod } from "@/lib/super-admin/super-admin-dashboard-shared";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";

export const metadata = { title: "Inicio" };

export const dynamic = "force-dynamic";

/** Inicio del super admin: cifras del negocio y la lista de empresas y solicitudes. */
export default async function DashboardHomePage({
	searchParams,
}: {
	searchParams: Promise<{ period?: string | string[]; simular?: string | string[] }>;
}) {
	await requireSuperAdminSession();
	const sp = await searchParams;
	return (
		<NewHomeView period={parseDashboardPeriod(Array.isArray(sp.period) ? sp.period[0] : sp.period)} demo={isHomeDemo(sp.simular)} />
	);
}
