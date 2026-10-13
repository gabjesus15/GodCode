/**
 * Pedidos de extras a medida (`addon_requests`). El dueño lo pide en /cuenta, el equipo lo
 * cotiza desde el super admin (se crea un extra privado de esa empresa con el precio), el
 * dueño lo acepta y lo paga con el flujo de siempre, y el equipo lo marca entregado.
 *
 *   submitted → quoted → accepted → paid → delivered
 *   submitted | quoted | accepted → cancelled (el dueño) · submitted | quoted → rejected (el equipo)
 *   quoted → rejected también si el dueño rechaza el precio.
 */

export type AddonRequestStatus = "submitted" | "quoted" | "accepted" | "paid" | "delivered" | "rejected" | "cancelled";
export type AddonRequestUrgency = "normal" | "pronto" | "urgente";
export type AddonRequestBilling = "one_time" | "monthly";

export const ADDON_REQUEST_URGENCIES: Array<{ value: AddonRequestUrgency; label: string }> = [
	{ value: "normal", label: "Sin apuro" },
	{ value: "pronto", label: "Lo antes posible" },
	{ value: "urgente", label: "Urgente" },
];

export const ADDON_REQUEST_STATUS_LABELS: Record<AddonRequestStatus, string> = {
	submitted: "Enviado",
	quoted: "Cotizado",
	accepted: "Aceptado",
	paid: "Pagado",
	delivered: "Entregado",
	rejected: "Rechazado",
	cancelled: "Cancelado",
};

/** Pedidos que siguen en curso (cuentan para el máximo abierto por empresa). */
export const OPEN_ADDON_REQUEST_STATUSES: AddonRequestStatus[] = ["submitted", "quoted", "accepted", "paid"];
export const MAX_OPEN_ADDON_REQUESTS = 3;

export type AddonRequestRow = {
	id: string;
	company_id: string;
	requested_by_email: string | null;
	title: string;
	description: string;
	urgency: string;
	status: string;
	quote_amount: number | string | null;
	quote_billing: string | null;
	quote_note: string | null;
	addon_id: string | null;
	quoted_at: string | null;
	delivered_at: string | null;
	created_at: string;
	updated_at: string;
};

export const ADDON_REQUEST_FIELDS =
	"id,company_id,requested_by_email,title,description,urgency,status,quote_amount,quote_billing,quote_note,addon_id,quoted_at,delivered_at,created_at,updated_at";

export function isAddonRequestStatus(value: unknown): value is AddonRequestStatus {
	return typeof value === "string" && value in ADDON_REQUEST_STATUS_LABELS;
}

export type AddonRequestDraft = { title: string; description: string; urgency: AddonRequestUrgency };

/** Valida lo que manda el dueño. Mismos límites que los `check` de la tabla. */
export function parseAddonRequestDraft(raw: unknown): { ok: true; draft: AddonRequestDraft } | { ok: false; error: string } {
	const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
	const title = String(body.title ?? "").trim().replace(/\s+/g, " ");
	const description = String(body.description ?? "").trim();
	const urgency = ADDON_REQUEST_URGENCIES.some((u) => u.value === body.urgency) ? (body.urgency as AddonRequestUrgency) : "normal";
	if (title.length < 3) return { ok: false, error: "Ponle un nombre corto a lo que necesitas." };
	if (title.length > 120) return { ok: false, error: "El nombre puede tener hasta 120 caracteres." };
	if (description.length < 10) return { ok: false, error: "Cuéntanos un poco más qué necesitas (al menos 10 caracteres)." };
	if (description.length > 4000) return { ok: false, error: "La descripción puede tener hasta 4000 caracteres." };
	return { ok: true, draft: { title, description, urgency } };
}

/** Lo que el dueño puede hacer con su pedido. */
export type OwnerAddonRequestAction = "cancel" | "reject_quote" | "accept";

export function nextStatusForOwnerAction(
	current: string,
	action: OwnerAddonRequestAction,
): { ok: true; status: AddonRequestStatus } | { ok: false; error: string } {
	if (action === "cancel") {
		return current === "submitted" || current === "quoted" || current === "accepted"
			? { ok: true, status: "cancelled" }
			: { ok: false, error: "Este pedido ya no se puede cancelar." };
	}
	if (action === "reject_quote") {
		return current === "quoted" ? { ok: true, status: "rejected" } : { ok: false, error: "Este pedido no tiene una cotización pendiente." };
	}
	// Aceptar es idempotente: si ya lo aceptó, vuelve a abrir el pago.
	return current === "quoted" || current === "accepted"
		? { ok: true, status: "accepted" }
		: { ok: false, error: "Este pedido no tiene una cotización para aceptar." };
}

/** Lo que el equipo puede hacer desde el super admin (cotizar se valida aparte). */
export type AdminAddonRequestAction = "reject" | "deliver";

export function nextStatusForAdminAction(
	current: string,
	action: AdminAddonRequestAction,
): { ok: true; status: AddonRequestStatus } | { ok: false; error: string } {
	if (action === "reject") {
		return current === "submitted" || current === "quoted"
			? { ok: true, status: "rejected" }
			: { ok: false, error: "Solo se rechaza un pedido sin pagar." };
	}
	return current === "paid" ? { ok: true, status: "delivered" } : { ok: false, error: "Solo se entrega un pedido pagado." };
}

export type AddonQuote = { amount: number; billing: AddonRequestBilling; note: string | null };

export function parseAddonQuote(raw: unknown): { ok: true; quote: AddonQuote } | { ok: false; error: string } {
	const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
	const amount = Math.round(Number(body.amount) * 100) / 100;
	if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "El precio tiene que ser mayor a 0." };
	if (amount > 100_000) return { ok: false, error: "Revisa el precio: es demasiado alto." };
	const billing: AddonRequestBilling = body.billing === "monthly" ? "monthly" : "one_time";
	const note = String(body.note ?? "").trim().slice(0, 2000) || null;
	return { ok: true, quote: { amount, billing, note } };
}

/** Slug del extra privado que nace al cotizar: único y reconocible. */
export function privateAddonSlug(requestId: string): string {
	return `custom-${requestId.replace(/-/g, "").slice(0, 12)}`;
}

/** Lo que ve el dueño en /cuenta (camelCase, montos como número). */
export type AddonRequestSummary = {
	id: string;
	title: string;
	description: string;
	urgency: string;
	status: AddonRequestStatus;
	quoteAmount: number | null;
	quoteBilling: AddonRequestBilling | null;
	quoteNote: string | null;
	addonId: string | null;
	createdAt: string;
	quotedAt: string | null;
	deliveredAt: string | null;
};

export function toAddonRequestSummary(row: AddonRequestRow): AddonRequestSummary {
	const amount = row.quote_amount == null ? null : Number(row.quote_amount);
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		urgency: row.urgency,
		status: isAddonRequestStatus(row.status) ? row.status : "submitted",
		quoteAmount: amount != null && Number.isFinite(amount) ? amount : null,
		quoteBilling: row.quote_billing === "monthly" || row.quote_billing === "one_time" ? row.quote_billing : null,
		quoteNote: row.quote_note,
		addonId: row.addon_id,
		createdAt: row.created_at,
		quotedAt: row.quoted_at,
		deliveredAt: row.delivered_at,
	};
}
