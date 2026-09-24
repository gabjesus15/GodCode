/**
 * Simulación del Inicio (`?simular=1`, solo fuera de producción): muestra una baja pedida
 * y una solicitud de alta de ejemplo para revisar el diseño sin tocar la base de datos.
 */
import type { OnboardingApplicationRow } from "./onboarding-application-types";

export const HOME_DEMO_PARAM = "simular";
export const DEMO_APPLICATION_ID = "demo-solicitud";
export const DEMO_CANCEL_REASON = "Vamos a cerrar el local de Providencia y probaremos otro sistema.";
export const DEMO_DAYS_LEFT = 18;

export function isHomeDemoAllowed(): boolean {
	return process.env.NODE_ENV !== "production";
}

export function isHomeDemo(raw: string | string[] | undefined | null): boolean {
	const value = Array.isArray(raw) ? raw[0] : raw;
	return isHomeDemoAllowed() && value === "1";
}

/** La empresa que la simulación marca como "quiere darse de baja". */
export function isDemoCompanyName(name: string | null | undefined): boolean {
	return /oishi/i.test(String(name ?? ""));
}

export function demoEndsAt(now = new Date()): string {
	return new Date(now.getTime() + DEMO_DAYS_LEFT * 86_400_000).toISOString();
}

/** Cuándo "pidió" la baja la empresa de la simulación: hace una hora. */
export function demoRequestedAt(now = new Date()): string {
	return new Date(now.getTime() - 3_600_000).toISOString();
}

export function demoApplication(now = new Date()): OnboardingApplicationRow {
	const created = new Date(now.getTime() - 2 * 3_600_000).toISOString();
	return {
		id: DEMO_APPLICATION_ID,
		business_name: "Sushi Nikkei Demo",
		responsible_name: "Camila Rojas",
		email: "camila.demo@example.com",
		status: "payment_pending",
		created_at: created,
		company_id: null,
		country: "CL",
		currency: "CLP",
		custom_domain: null,
		custom_domain_value: null,
		legal_name: "Nikkei Demo SpA",
		fiscal_address: "Av. Providencia 1234, Santiago",
		subscription_payment_method: "transferencia_bancaria",
		plan_label: "Avanzado",
		plan_price: 39,
		payment_status: "pending_validation",
		last_payment: {
			status: "pending_validation",
			amount_paid: 39,
			payment_date: created,
			payment_reference: "DEMO-000123",
			reference_file_url: null,
		},
		delivery_booking: { scheduled_for: null, assigned_to: null, status: "pending" },
		can_delete: false,
		delete_block_reason: "Es una simulación: no se puede eliminar.",
	};
}

/** Parámetros del Inicio que se conservan al abrir y cerrar ventanas. */
export function homeQuery(params: { period?: string | null; demo?: boolean }): string {
	const q = new URLSearchParams();
	if (params.period) q.set("period", params.period);
	if (params.demo) q.set(HOME_DEMO_PARAM, "1");
	const s = q.toString();
	return s ? `?${s}` : "";
}
