/**
 * Rutas de navegación del panel super-admin (sidebar + paleta de comandos).
 */

import type { LucideIcon } from "lucide-react";
import {
	Activity,
	BarChart3,
	Building2,
	ClipboardList,
	CreditCard,
	LayoutDashboard,
	LifeBuoy,
	MonitorSmartphone,
	Package,
	ScrollText,
	ShieldAlert,
	ShieldCheck,
	Wrench,
} from "lucide-react";

export type SuperAdminNavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
	keywords?: string;
};

export const SUPER_ADMIN_NAV: SuperAdminNavItem[] = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: "inicio resumen" },
	{ href: "/dashboard/salud-pagos", label: "Salud de pagos", icon: ShieldAlert, keywords: "pagos cobros" },
	{ href: "/dashboard/onboarding-embudo", label: "Embudo onboarding", icon: Activity, keywords: "funnel" },
	{ href: "/dashboard/analytics-global", label: "Analytics global", icon: BarChart3, keywords: "visitas paises trafico" },
	{ href: "/dashboard/auditoria", label: "Auditoría", icon: ScrollText, keywords: "logs mutaciones" },
	{ href: "/companies", label: "Empresas", icon: Building2, keywords: "tenant negocios" },
	{ href: "/onboarding/solicitudes", label: "Solicitudes", icon: ClipboardList, keywords: "onboarding" },
	{ href: "/plans", label: "Planes", icon: CreditCard, keywords: "precios" },
	{ href: "/addons", label: "Servicios extra", icon: Package, keywords: "addons" },
	{ href: "/plan-payment-methods", label: "Métodos de pago (plan)", icon: CreditCard, keywords: "planes pago" },
	{ href: "/tickets", label: "Tickets", icon: LifeBuoy, keywords: "soporte" },
	{ href: "/landing", label: "Landing", icon: MonitorSmartphone, keywords: "landing leads media webhooks" },
	{ href: "/herramientas", label: "Herramientas", icon: Wrench, keywords: "tools" },
	{ href: "/herramientas/autenticador", label: "Autenticador MFA", icon: ShieldCheck, keywords: "totp google authenticator 2fa seguridad" },
];
