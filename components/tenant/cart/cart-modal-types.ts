import type { Json } from "../../../types/supabase-database";
import type { CartFulfillment } from "./cart-context";

export interface BranchInfo {
	id: string;
	name: string | null;
	address: string | null;
	phone: string | null;
	country?: string | null;
	currency?: string | null;
	company_id?: string | null;
	bank_name?: string | null;
	account_type?: string | null;
	account_number?: string | null;
	account_rut?: string | null;
	account_email?: string | null;
	account_holder?: string | null;
	payment_methods?: string[];
	pago_movil?: {
		banco?: string;
		telefono?: string;
		identificacion?: string;
	} | null;
	zelle?: {
		email?: string;
		name?: string;
	} | null;
	transferencia_bancaria?: {
		banco?: string;
		nro_cuenta?: string;
		tipo_cuenta?: string;
		identificacion?: string;
		titular?: string;
		email?: string;
	} | null;
	stripe?: { [key: string]: string } | null;
	mercadopago?: { [key: string]: string } | null;
	paypal?: { [key: string]: string } | null;
	delivery_settings?: Json | null;
	/** Flags/objetos configurados en admin para métodos presenciales. */
	efectivo?: unknown;
	tarjeta?: unknown;
	origin_lat?: number | null;
	origin_lng?: number | null;
	order_intake_paused?: boolean | null;
	order_intake_pause_message?: string | null;
	order_intake_paused_at?: string | null;
	schedule?: string | null;
}

export interface BusinessInfo {
	name?: string | null;
	address?: string | null;
	phone?: string | null;
	schedule?: string | null;
	bank_name?: string | null;
	account_type?: string | null;
	account_number?: string | null;
	account_rut?: string | null;
	account_email?: string | null;
	account_holder?: string | null;
	country?: string | null;
}

export interface CartLineItem {
	id: string;
	lineId?: string;
	name?: string | null;
	image_url?: string | null;
	quantity: number;
	price?: number | null;
	has_discount?: boolean | null;
	discount_price?: number | null;
	description?: string | null;
	is_active?: boolean | null;
	selected_extras?: Array<{ id: string; name: string; price: number; qty: number }>;
	selected_beverages?: Array<{ id: string; name: string; price: number; qty: number }>;
	line_summary?: string | null;
	line_note?: string | null;
}

/** Tipo unificado para manejar la información activa */
export type ActiveSessionInfo = BusinessInfo & Partial<BranchInfo>;

export type LastOrderSuccess = {
	id: number;
	order_number: number | null;
	handoff_code: string | null;
	fulfillment: CartFulfillment;
	paymentStatus?: string | null;
	evidenceStatus?: string | null;
};

/** Resultado del envío del pedido; los pasos del checkout viven en `checkoutSession`. */
export type CheckoutResultState = {
	showSuccess: boolean;
	isSaving: boolean;
	receiptUploadFailed: boolean;
	lastOrderSuccess: LastOrderSuccess | null;
};

export const INITIAL_CHECKOUT_RESULT: CheckoutResultState = {
	showSuccess: false,
	isSaving: false,
	receiptUploadFailed: false,
	lastOrderSuccess: null,
};
