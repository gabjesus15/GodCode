/**
 * Nombre y tono de cada estado, para el super admin y para el portal /cuenta. Antes había
 * cuatro mapas que no coincidían ("Trial" en un lado, "Prueba" en otro; `cancelled` sin
 * nombre en el super admin; prioridad "alta" roja en uno y ámbar en otro).
 *
 * Las claves son los valores de la base (en minúsculas). Lo que no está en el mapa se
 * muestra tal cual, con tono neutro, para que un estado nuevo no desaparezca de la vista.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";
export type StatusDescriptor = { label: string; tone: StatusTone };

type StatusMap = Record<string, StatusDescriptor>;

/** `companies.subscription_status` (más `expired`, que calcula la interfaz). */
export const SUBSCRIPTION_STATUSES: StatusMap = {
	active: { label: "Activa", tone: "success" },
	trial: { label: "Prueba", tone: "info" },
	trialing: { label: "Prueba", tone: "info" },
	payment_pending: { label: "Pago pendiente", tone: "warning" },
	pending: { label: "Pendiente", tone: "warning" },
	cancelled: { label: "Cancelada", tone: "warning" },
	canceled: { label: "Cancelada", tone: "warning" },
	suspended: { label: "Suspendida", tone: "danger" },
	expired: { label: "Vencida", tone: "danger" },
	past_due: { label: "Pago atrasado", tone: "danger" },
	unpaid: { label: "Sin pago", tone: "danger" },
	paused: { label: "Pausada", tone: "neutral" },
};

/** `payments_history.status` y `onboarding_applications.payment_status`. */
export const PAYMENT_STATUSES: StatusMap = {
	pending: { label: "Por pagar", tone: "warning" },
	pending_validation: { label: "En revisión", tone: "warning" },
	validacion: { label: "En revisión", tone: "warning" },
	payment_pending: { label: "Pago pendiente", tone: "warning" },
	paid: { label: "Pagado", tone: "success" },
	approved: { label: "Pagado", tone: "success" },
	payment_validated: { label: "Pagado", tone: "success" },
	completed: { label: "Pagado", tone: "success" },
	rejected: { label: "Rechazado", tone: "danger" },
	failed: { label: "Fallido", tone: "danger" },
	cancelled: { label: "Anulado", tone: "neutral" },
	canceled: { label: "Anulado", tone: "neutral" },
	refunded: { label: "Reembolsado", tone: "neutral" },
};

/** `onboarding_applications.status`: el avance del alta. */
export const ONBOARDING_STATUSES: StatusMap = {
	pending_verification: { label: "Correo sin verificar", tone: "warning" },
	email_verified: { label: "Correo verificado", tone: "info" },
	form_completed: { label: "Formulario completo", tone: "info" },
	payment_pending: { label: "Pago pendiente", tone: "warning" },
	payment_validated: { label: "Pago validado", tone: "success" },
	active: { label: "Activa", tone: "success" },
	rejected: { label: "Rechazada", tone: "danger" },
	expired: { label: "Vencida", tone: "neutral" },
};

export const TICKET_STATUSES: StatusMap = {
	open: { label: "Abierto", tone: "info" },
	in_progress: { label: "En curso", tone: "warning" },
	waiting_customer: { label: "Esperando respuesta", tone: "warning" },
	resolved: { label: "Resuelto", tone: "success" },
	closed: { label: "Cerrado", tone: "neutral" },
};

/** Tickets que todavía piden trabajo: lo que el Inicio cuenta y la bandeja muestra por defecto. */
export const OPEN_TICKET_STATUSES = ["open", "in_progress", "waiting_customer"] as const;

/** Solicitudes de alta que esperan algo del equipo: el contador del menú y el Inicio. */
export const PENDING_APPLICATION_STATUSES = ["pending_verification", "email_verified", "form_completed", "payment_pending"] as const;

export const TICKET_PRIORITIES: StatusMap = {
	low: { label: "Baja", tone: "neutral" },
	medium: { label: "Media", tone: "info" },
	high: { label: "Alta", tone: "warning" },
	critical: { label: "Crítica", tone: "danger" },
};

/** Estados que antes llegaban en español desde datos antiguos. */
const LEGACY_ALIASES: Record<string, string> = {
	abierto: "open",
	en_progreso: "in_progress",
	"in progress": "in_progress",
	resuelto: "resolved",
	cerrado: "closed",
	alta: "high",
	media: "medium",
	baja: "low",
	aprobado: "approved",
	pendiente: "pending",
	rechazado: "rejected",
	reembolsado: "refunded",
};

export function describeStatus(map: StatusMap, value: string | null | undefined, fallback = "Sin estado"): StatusDescriptor {
	const raw = String(value ?? "").trim().toLowerCase();
	if (!raw) return { label: fallback, tone: "neutral" };
	const key = LEGACY_ALIASES[raw] ?? raw;
	return map[key] ?? { label: raw.replace(/_/g, " "), tone: "neutral" };
}

/** Solo las etiquetas, para selects y textos. */
export function statusLabels(map: StatusMap): Record<string, string> {
	return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, value.label]));
}
