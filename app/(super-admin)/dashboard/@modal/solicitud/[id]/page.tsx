import { ApplicationManageModal } from "@/components/super-admin/home/manage/application-manage-modal";
import { homeQuery, isHomeDemo } from "@/lib/super-admin/home-demo";
import { parseDashboardPeriod } from "@/lib/super-admin/super-admin-dashboard-shared";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";

export const dynamic = "force-dynamic";

/** Revisión de una solicitud de alta en ventana, encima del Inicio. */
export default async function ApplicationManageModalPage({
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
	return <ApplicationManageModal id={id} closeHref={closeHref} demo={demo} />;
}
