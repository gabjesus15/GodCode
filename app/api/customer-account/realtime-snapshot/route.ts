import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

type SnapshotScope = "company" | "payments" | "tickets" | "addons" | "entitlements" | "full";

function parseScope(raw: string | null): SnapshotScope {
	const value = String(raw ?? "full").trim().toLowerCase();
	if (value === "company" || value === "payments" || value === "tickets" || value === "addons" || value === "entitlements") {
		return value;
	}
	return "full";
}

export async function GET(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const scope = parseScope(req.nextUrl.searchParams.get("scope"));
	const includeCompany = scope === "full" || scope === "company";
	const includePayments = scope === "full" || scope === "payments";
	const includeTickets = scope === "full" || scope === "tickets";
	const includeEntitlements = scope === "full" || scope === "entitlements";
	const includeAddons = scope === "full" || scope === "addons";

	const [companyRes, paymentsRes, ticketsRes, entitlementsRes, addonsRes] = await Promise.all([
		includeCompany
			? supabaseAdmin
					.from("companies")
					.select("id,subscription_status,subscription_ends_at")
					.eq("id", ctx.companyId)
					.maybeSingle()
			: Promise.resolve({ data: null, error: null }),
		includePayments
			? supabaseAdmin
					.from("payments_history")
					.select("id,amount_paid,status,payment_date,payment_method,months_paid,payment_reference,reference_file_url")
					.eq("company_id", ctx.companyId)
					.order("payment_date", { ascending: false })
					.limit(50)
			: Promise.resolve({ data: null, error: null }),
		includeTickets
			? supabaseAdmin
					.from("saas_tickets")
					.select("id,subject,description,category,priority,status,created_at,updated_at,last_message_at")
					.eq("company_id", ctx.companyId)
					.order("last_message_at", { ascending: false })
					.limit(50)
			: Promise.resolve({ data: null, error: null }),
		includeEntitlements
			? supabaseAdmin
					.from("company_branch_extra_entitlements")
					.select("id,quantity,months_purchased,amount_paid,unit_price,status,starts_at,expires_at,created_at,payment:payments_history(payment_reference)")
					.eq("company_id", ctx.companyId)
					.order("created_at", { ascending: false })
					.limit(50)
			: Promise.resolve({ data: null, error: null }),
		includeAddons
			? supabaseAdmin
					.from("company_addons")
					.select("id,status,price_paid,expires_at,created_at,addon:addons(id,slug,name,type)")
					.eq("company_id", ctx.companyId)
					.eq("status", "active")
					.order("created_at", { ascending: false })
			: Promise.resolve({ data: null, error: null }),
	]);

	for (const result of [paymentsRes, companyRes, ticketsRes, entitlementsRes, addonsRes]) {
		if (result.error) {
			return NextResponse.json({ error: result.error.message }, { status: 500 });
		}
	}

	const payments = includePayments
		? (paymentsRes.data ?? []).map((row) => ({
				id: String(row.id),
				amount_paid: Number(row.amount_paid ?? 0) || 0,
				status: row.status,
				payment_date: row.payment_date,
				payment_method: row.payment_method,
				months_paid: row.months_paid,
				payment_reference: row.payment_reference,
				reference_file_url: row.reference_file_url,
			}))
		: undefined;

	const tickets = includeTickets
		? (ticketsRes.data ?? []).map((row) => ({
				id: String(row.id),
				subject: String(row.subject ?? ""),
				description: String(row.description ?? ""),
				category: row.category,
				priority: row.priority,
				status: row.status,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				lastMessageAt: row.last_message_at,
			}))
		: undefined;

	const branchEntitlements = includeEntitlements
		? (entitlementsRes.data ?? []).map((row) => {
				const relation = (row as { payment?: { payment_reference?: string | null } | Array<{ payment_reference?: string | null }> | null }).payment;
				const paymentRef = Array.isArray(relation)
					? relation[0]?.payment_reference ?? null
					: relation?.payment_reference ?? null;

				return {
					id: String(row.id),
					quantity: Number(row.quantity ?? 0) || 0,
					monthsPurchased: Number(row.months_purchased ?? 0) || 0,
					amountPaid: Number(row.amount_paid ?? 0) || 0,
					unitPrice: Number(row.unit_price ?? 0) || 0,
					status: String(row.status ?? "pending"),
					startsAt: row.starts_at,
					expiresAt: row.expires_at,
					createdAt: row.created_at,
					paymentReference: paymentRef,
				};
			})
		: undefined;

	const activeAddons = includeAddons
		? (addonsRes.data ?? []).map((row) => {
				const relation = (row as {
					addon?:
						| { id?: string | null; slug?: string | null; name?: string | null; type?: string | null }
						| Array<{ id?: string | null; slug?: string | null; name?: string | null; type?: string | null }>
						| null;
				}).addon;
				const addon = Array.isArray(relation) ? relation[0] : relation;

				return {
					id: String(row.id),
					status: String(row.status ?? "active"),
					price_paid: Number(row.price_paid ?? 0) || 0,
					expires_at: row.expires_at,
					created_at: row.created_at,
					addon_id: addon?.id ?? null,
					slug: addon?.slug ?? null,
					name: addon?.name ?? null,
					type: addon?.type ?? null,
				};
			})
		: undefined;

	return NextResponse.json({
		ok: true,
		scope,
		serverNow: new Date().toISOString(),
		company:
			includeCompany && companyRes.data
				? {
						id: String(companyRes.data.id),
						subscription_status: companyRes.data.subscription_status,
						subscription_ends_at: companyRes.data.subscription_ends_at,
					}
				: undefined,
		payments,
		tickets,
		branchEntitlements,
		activeAddons,
	});
}
