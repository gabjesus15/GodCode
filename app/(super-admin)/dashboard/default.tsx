import { NewHomeView } from "@/components/super-admin/home/new-home-view";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";

/**
 * Al entrar directo a /dashboard/empresa/[id] (recarga o enlace) la página principal no
 * coincide con la URL: se pinta el Inicio detrás de la ventana, con el periodo por defecto.
 */
export default async function DashboardDefault() {
	await requireSuperAdminSession();
	return <NewHomeView period="30" />;
}
