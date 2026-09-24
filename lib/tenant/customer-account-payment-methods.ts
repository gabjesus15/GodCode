import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isPaymentMethodAvailableForCountry } from "@/lib/payments/payment-method-countries";
import { isPayPalConfigured } from "@/lib/payments/paypal";

/** Método de pago del SaaS que un dueño puede usar desde /cuenta, con sus datos de cobro. */
export type PortalPaymentMethod = {
	id: string;
	slug: string;
	name: string;
	countries: string[] | null;
	/** Siempre `false` en el portal: todo pago queda pendiente hasta que se valida. */
	auto_verify: false;
	config: Record<string, string>;
};

type MethodRow = {
	id: string;
	slug: string;
	name: string;
	countries: string[] | null;
	auto_verify: boolean | null;
};

/**
 * Métodos manuales con los que el dueño paga desde /cuenta (plan, extras, sucursales):
 * transfiere y sube el comprobante, que valida el equipo.
 *
 * Los métodos `auto_verify` (PayPal) no van aquí: se cobran en línea con su propio botón
 * (`getPortalPayPalClientId`). Antes el portal los daba por pagados sin recibir dinero.
 */
export async function listPortalPaymentMethods(country: string | null): Promise<PortalPaymentMethod[]> {
	const { data: methods } = await supabaseAdmin
		.from("plan_payment_methods")
		.select("id,slug,name,countries,auto_verify")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });

	const available = ((methods ?? []) as MethodRow[]).filter(
		(method) => !method.auto_verify && isPaymentMethodAvailableForCountry(method.countries, country),
	);
	if (available.length === 0) return [];

	const { data: configRows } = await supabaseAdmin
		.from("plan_payment_method_config")
		.select("method_id,key,value")
		.in(
			"method_id",
			available.map((method) => method.id),
		);

	const configByMethod = new Map<string, Record<string, string>>();
	for (const row of (configRows ?? []) as Array<{ method_id: string; key: string | null; value: string | null }>) {
		if (!row.key) continue;
		const config = configByMethod.get(row.method_id) ?? {};
		config[row.key] = row.value ?? "";
		configByMethod.set(row.method_id, config);
	}

	return available.map((method) => ({
		id: method.id,
		slug: method.slug,
		name: method.name,
		countries: method.countries,
		auto_verify: false,
		config: configByMethod.get(method.id) ?? {},
	}));
}

/**
 * Client ID de PayPal si el dueño puede pagar con PayPal desde /cuenta: el método está
 * activo para su país en "Métodos de pago (plan)" y el servidor tiene las credenciales.
 * `null` si no (el portal muestra solo los métodos manuales).
 */
export async function getPortalPayPalClientId(country: string | null): Promise<string | null> {
	if (!isPayPalConfigured()) return null;
	const { data } = await supabaseAdmin
		.from("plan_payment_methods")
		.select("countries")
		.eq("slug", "paypal")
		.eq("is_active", true)
		.maybeSingle();
	if (!data || !isPaymentMethodAvailableForCountry((data as { countries: string[] | null }).countries, country)) {
		return null;
	}
	return (process.env.PAYPAL_CLIENT_ID ?? "").trim() || null;
}
