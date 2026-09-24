/**
 * Tipos del Inicio del super admin (sin Supabase): importables desde componentes cliente.
 */
import type { StatusTone } from "@/lib/status/status-labels";

export type HomeKpiKey = "active" | "churned" | "applications" | "tickets";

export type HomeKpi = {
	key: HomeKpiKey;
	label: string;
	value: number;
	/** Cambio en el periodo elegido (altas, bajas, solicitudes o tickets nuevos). */
	delta: number;
	/** Si subir es bueno (activas) o malo (bajas, tickets). */
	goodWhenUp: boolean;
	helper: string;
	/** Puntos de la línea pequeña, de más antiguo a más reciente. */
	series: number[];
	/** Página a la que lleva la tarjeta; `null` si lo que cuenta ya está en la tabla del Inicio. */
	href: string | null;
};

/**
 * - `cancelling`: el dueño pidió la baja; sigue online hasta el vencimiento.
 * - `churned`: vencidas, suspendidas o canceladas que ya no están online.
 * - `application`: solicitud de alta que todavía no es empresa (o espera validar el pago).
 */
export type HomeCompanyGroup = "active" | "expiring" | "cancelling" | "churned" | "pending" | "application";

/** Baja pedida, pagos que no cuadran con el estado, o solicitud de alta. */
export type HomeAlertKind = "cancellation" | "payment" | "application";

/** Aviso que se pinta encima de la fila y la sube al principio de la lista. */
export type HomeRowAlert = {
	kind: HomeAlertKind;
	title: string;
	detail: string;
	/** Qué abre el botón del aviso (la ventana de la empresa o de la solicitud). */
	href: string;
	actionLabel: string;
};

export type HomeCompanyRow = {
	/** id de la empresa o, si `kind` es `application`, de la solicitud. */
	id: string;
	kind: "company" | "application";
	name: string;
	/** Dirección del menú (empresas) o responsable (solicitudes). */
	host: string;
	url: string;
	logoUrl: string | null;
	/** Ya enmascarados en el servidor: el dato completo nunca llega al navegador. */
	emailMasked: string | null;
	whatsappMasked: string | null;
	planName: string | null;
	status: { label: string; variant: StatusTone };
	group: HomeCompanyGroup;
	endsAt: string | null;
	daysLeft: number | null;
	createdAt: string | null;
	alert: HomeRowAlert | null;
};

export type HomeOverview = {
	kpis: HomeKpi[];
	companies: HomeCompanyRow[];
	error: string | null;
};
