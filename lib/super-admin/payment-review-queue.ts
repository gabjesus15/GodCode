import "server-only";

import { classifyPortalPaymentReference, describePortalOrder } from "@/lib/billing/portal-orders";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/**
 * Todo lo que el equipo tiene que validar, en un solo lugar:
 * - pagos del portal (/cuenta) con comprobante (`payments_history` en `pending_validation`);
 * - pagos manuales del alta (`onboarding_applications.payment_status = pending_validation`).
 * Los pedidos que el cliente todavía no paga no son trabajo del equipo: solo se cuentan.
 */

/** Referencias de los pedidos del portal (ver `portal-orders`). */
const PORTAL_REFERENCE_FILTER =
	"payment_reference.like.PLANCHG-%,payment_reference.like.RENEW-%,payment_reference.like.ADDON-%,payment_reference.like.CUST-%";

export type PaymentReviewItem = {
	key: string;
	source: "portal" | "onboarding";
	/** Pagos del portal: se validan por id. */
	paymentId: string | null;
	/** Pagos del alta: se validan por referencia. */
	paymentReference: string;
	companyId: string | null;
	businessName: string;
	contactEmail: string | null;
	concept: string;
	amountUsd: number;
	method: string | null;
	receiptUrl: string | null;
	submittedAt: string | null;
	/** Algo que el equipo debe saber antes de decidir. */
	note: string | null;
};

type PortalRow = {
	id: string;
	company_id: string;
	plan_id: string | null;
	amount_paid: number | null;
	months_paid: number | null;
	status: string | null;
	payment_method: string | null;
	payment_method_slug: string | null;
	payment_reference: string | null;
	reference_file_url: string | null;
	payment_date: string | null;
};

type OnboardingRow = {
	id: string;
	business_name: string | null;
	email: string | null;
	company_id: string | null;
	plan_id: string | null;
	payment_reference: string | null;
	payment_reference_url: string | null;
	payment_amount: number | null;
	payment_months: number | null;
	subscription_payment_method: string | null;
	updated_at: string | null;
};

export async function loadPaymentReviewQueue(): Promise<{
	items: PaymentReviewItem[];
	awaitingCustomerCount: number;
	error: string | null;
}> {
	const [portalRes, onboardingRes, awaitingRes] = await Promise.all([
		supabaseAdmin
			.from("payments_history")
			.select("id,company_id,plan_id,amount_paid,months_paid,status,payment_method,payment_method_slug,payment_reference,reference_file_url,payment_date")
			.eq("status", "pending_validation")
			.or(PORTAL_REFERENCE_FILTER)
			.order("payment_date", { ascending: true, nullsFirst: false })
			.limit(200),
		supabaseAdmin
			.from("onboarding_applications")
			.select("id,business_name,email,company_id,plan_id,payment_reference,payment_reference_url,payment_amount,payment_months,subscription_payment_method,updated_at")
			.eq("payment_status", "pending_validation")
			.order("updated_at", { ascending: true })
			.limit(200),
		supabaseAdmin
			.from("payments_history")
			.select("id", { count: "exact", head: true })
			.eq("status", "pending")
			.or(PORTAL_REFERENCE_FILTER),
	]);

	const error = portalRes.error?.message ?? onboardingRes.error?.message ?? null;
	const portalRows = ((portalRes.data ?? []) as PortalRow[]).filter((row) => classifyPortalPaymentReference(row.payment_reference));
	const onboardingRows = (onboardingRes.data ?? []) as OnboardingRow[];

	const companyIds = [...new Set(portalRows.map((row) => row.company_id))];
	const planIds = [...new Set([...portalRows, ...onboardingRows].map((row) => row.plan_id).filter(Boolean))] as string[];
	const addonIds = [
		...new Set(portalRows.map((row) => classifyPortalPaymentReference(row.payment_reference)?.addonId).filter(Boolean)),
	] as string[];
	const methodSlugs = [...new Set(onboardingRows.map((row) => row.subscription_payment_method).filter(Boolean))] as string[];

	const [companiesRes, plansRes, addonsRes, methodsRes] = await Promise.all([
		companyIds.length
			? supabaseAdmin.from("companies").select("id,name,email").in("id", companyIds)
			: Promise.resolve({ data: [] }),
		planIds.length ? supabaseAdmin.from("plans").select("id,name").in("id", planIds) : Promise.resolve({ data: [] }),
		addonIds.length ? supabaseAdmin.from("addons").select("id,name").in("id", addonIds) : Promise.resolve({ data: [] }),
		methodSlugs.length
			? supabaseAdmin.from("plan_payment_methods").select("slug,name").in("slug", methodSlugs)
			: Promise.resolve({ data: [] }),
	]);

	const companies = new Map(((companiesRes.data ?? []) as Array<{ id: string; name: string | null; email: string | null }>).map((row) => [row.id, row]));
	const plans = new Map(((plansRes.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));
	const addons = new Map(((addonsRes.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));
	const methods = new Map(((methodsRes.data ?? []) as Array<{ slug: string; name: string }>).map((row) => [row.slug, row.name]));

	const portalItems: PaymentReviewItem[] = portalRows.map((row) => {
		const company = companies.get(row.company_id);
		const paidByPayPal = row.payment_method_slug === "paypal";
		return {
			key: `portal:${row.id}`,
			source: "portal",
			paymentId: row.id,
			paymentReference: String(row.payment_reference ?? ""),
			companyId: row.company_id,
			businessName: String(company?.name ?? "Empresa"),
			contactEmail: company?.email ?? null,
			concept: describePortalOrder(row, { plan: (id) => plans.get(id), addon: (id) => addons.get(id) }),
			amountUsd: Number(row.amount_paid ?? 0) || 0,
			method: row.payment_method,
			receiptUrl: row.reference_file_url,
			submittedAt: row.payment_date,
			note: paidByPayPal
				? "PayPal cobró este pago pero no se aplicó solo. Revísalo en PayPal y valídalo para aplicarlo."
				: row.reference_file_url
					? null
					: "Sin comprobante: valídalo solo si ya viste el dinero en la cuenta.",
		};
	});

	const onboardingItems: PaymentReviewItem[] = onboardingRows.map((row) => {
		const months = Math.max(1, Number(row.payment_months ?? 1) || 1);
		const planName = row.plan_id ? plans.get(row.plan_id) : null;
		return {
			key: `onboarding:${row.id}`,
			source: "onboarding",
			paymentId: null,
			paymentReference: String(row.payment_reference ?? ""),
			companyId: row.company_id,
			businessName: String(row.business_name ?? "Solicitud"),
			contactEmail: row.email,
			concept: `Alta${planName ? ` · ${planName}` : ""} · ${months} ${months === 1 ? "mes" : "meses"}`,
			amountUsd: Number(row.payment_amount ?? 0) || 0,
			method: row.subscription_payment_method ? (methods.get(row.subscription_payment_method) ?? row.subscription_payment_method) : null,
			receiptUrl: row.payment_reference_url,
			submittedAt: row.updated_at,
			note: row.payment_reference_url ? null : "Sin comprobante.",
		};
	});

	const items = [...portalItems, ...onboardingItems]
		.filter((item) => item.paymentId || item.paymentReference)
		.sort((a, b) => String(a.submittedAt ?? "").localeCompare(String(b.submittedAt ?? "")));

	return { items, awaitingCustomerCount: Number(awaitingRes.count ?? 0), error };
}

/** Cuántos pagos esperan validación (para el contador del menú). */
export async function countPaymentsAwaitingReview(): Promise<number> {
	const [portal, onboarding] = await Promise.all([
		supabaseAdmin
			.from("payments_history")
			.select("id", { count: "exact", head: true })
			.eq("status", "pending_validation")
			.or(PORTAL_REFERENCE_FILTER),
		supabaseAdmin
			.from("onboarding_applications")
			.select("id", { count: "exact", head: true })
			.eq("payment_status", "pending_validation"),
	]);
	return Number(portal.count ?? 0) + Number(onboarding.count ?? 0);
}
