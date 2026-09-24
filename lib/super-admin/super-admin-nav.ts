/**
 * Rutas de navegación del panel super-admin (sidebar + paleta de comandos).
 */

import type { LucideIcon } from "lucide-react";
import {
	Activity,
	CreditCard,
	Layers,
	LayoutDashboard,
	LifeBuoy,
	Mail,
	MonitorSmartphone,
	Package,
	PieChart,
	Receipt,
	ScrollText,
	Settings,
	ShieldCheck,
	SlidersHorizontal,
	Wallet,
} from "lucide-react";

export type SuperAdminNavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
	keywords?: string;
};

export type SuperAdminNavGroup = {
	label: string;
	/** Con icono el grupo se pliega en la barra lateral; sin icono sus secciones van sueltas. */
	icon?: LucideIcon;
	items: SuperAdminNavItem[];
};

/** Agrupado por tarea: lo del día a día arriba, métricas y ajustes abajo. */
export const SUPER_ADMIN_NAV_GROUPS: SuperAdminNavGroup[] = [
	{
		label: "Día a día",
		items: [
			{ href: "/dashboard", label: "Inicio", icon: LayoutDashboard, keywords: "dashboard resumen empresas solicitudes altas bajas" },
			{ href: "/dashboard/pagos", label: "Pagos por validar", icon: Receipt, keywords: "comprobantes transferencias validar cobros" },
			{ href: "/tickets", label: "Tickets", icon: LifeBuoy, keywords: "soporte mensajes" },
		],
	},
	{
		label: "Catálogo",
		icon: Layers,
		items: [
			{ href: "/plans", label: "Planes", icon: CreditCard, keywords: "precios" },
			{ href: "/addons", label: "Servicios extra", icon: Package, keywords: "addons extras" },
			{ href: "/plan-payment-methods", label: "Métodos de cobro", icon: Wallet, keywords: "pago planes transferencia paypal" },
		],
	},
	{
		label: "Métricas",
		icon: PieChart,
		items: [
			{ href: "/landing", label: "Landing y tráfico", icon: MonitorSmartphone, keywords: "landing trafico analytics visitas paises imagenes contacto instagram whatsapp" },
			{ href: "/dashboard/onboarding-embudo", label: "Embudo de altas", icon: Activity, keywords: "funnel onboarding conversion" },
			{ href: "/dashboard/auditoria", label: "Auditoría", icon: ScrollText, keywords: "logs cambios registro" },
		],
	},
	{
		label: "Sitio y ajustes",
		icon: SlidersHorizontal,
		items: [
			{ href: "/herramientas/correos", label: "Correos", icon: Mail, keywords: "emails recordatorios avisos plantillas resend vencimientos" },
			{ href: "/herramientas", label: "Configuración", icon: Settings, keywords: "herramientas roles modulos broadcast" },
			{ href: "/herramientas/autenticador", label: "Doble factor", icon: ShieldCheck, keywords: "mfa totp authenticator 2fa seguridad" },
		],
	},
];

export const SUPER_ADMIN_NAV: SuperAdminNavItem[] = SUPER_ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/**
 * Entrada del menú que corresponde a una ruta: la de `href` más largo que la contiene
 * (así `/dashboard/pagos` no marca también `/dashboard`).
 */
export function resolveActiveNav(pathname: string | null | undefined): { item: SuperAdminNavItem; group: SuperAdminNavGroup } | null {
	const path = String(pathname ?? "").split("?")[0].replace(/\/+$/, "") || "/";
	let best: { item: SuperAdminNavItem; group: SuperAdminNavGroup } | null = null;
	for (const group of SUPER_ADMIN_NAV_GROUPS) {
		for (const item of group.items) {
			const matches = path === item.href || path.startsWith(`${item.href}/`);
			if (matches && (!best || item.href.length > best.item.href.length)) best = { item, group };
		}
	}
	return best;
}
