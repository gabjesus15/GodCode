/** Una solicitud de alta tal como la devuelve GET /api/super-admin/solicitudes. */
export type OnboardingApplicationRow = {
	id: string;
	business_name: string | null;
	responsible_name: string | null;
	email: string | null;
	status: string | null;
	created_at: string | null;
	company_id: string | null;
	country: string | null;
	currency: string | null;
	custom_domain: string | null;
	custom_domain_value?: string | null;
	legal_name: string | null;
	fiscal_address: string | null;
	subscription_payment_method: string | null;
	plan_label: string;
	plan_price: number | null;
	payment_status: string | null;
	last_payment: {
		status: string;
		amount_paid: number;
		payment_date: string;
		payment_reference: string | null;
		reference_file_url: string | null;
	} | null;
	delivery_booking: {
		scheduled_for: string | null;
		assigned_to: string | null;
		status: string;
	} | null;
	can_delete?: boolean;
	delete_block_reason?: string | null;
};
