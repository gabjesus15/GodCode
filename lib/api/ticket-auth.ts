import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCustomerMembership } from "@/lib/super-admin/account-access";
import { getSubdomainFromHost } from "@/lib/tenant/main-domain-host";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type MessageError = { message: string } | null;

type TenantUserRow = {
	company_id: string;
	role: string;
};

const TENANT_ALLOWED_ROLES = new Set(["admin", "ceo", "cashier", "staff"]);
const CUSTOMER_PORTAL_ROLES = new Set(["ceo"]);

export type TicketAuthContext = {
	companyId: string;
	email: string;
};

async function resolveTenantSlug(): Promise<string | null> {
	const hdrs = await headers();
	const fromHeader = hdrs.get("x-tenant-slug")?.trim().toLowerCase();
	if (fromHeader) return fromHeader;
	const host = hdrs.get("host") ?? "";
	return getSubdomainFromHost(host);
}

async function resolveTenantSession(
	client: SupabaseClient,
): Promise<TicketAuthContext | { error: string }> {
	const supabase = await createSupabaseServerClient("tenant");
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user?.email) {
		return { error: "No autenticado" };
	}

	const email = user.email.trim().toLowerCase();
	const tenantSlug = await resolveTenantSlug();

	const { data: rows, error } = (await client
		.from("users")
		.select("company_id,role")
		.ilike("email", email)) as { data: TenantUserRow[] | null; error: MessageError };

	if (error) return { error: error.message };

	let candidates = rows ?? [];

	if (tenantSlug) {
		const { data: company } = await client
			.from("companies")
			.select("id")
			.eq("public_slug", tenantSlug)
			.maybeSingle();

		if (company?.id) {
			candidates = candidates.filter((row) => row.company_id === company.id);
		}
	}

	const userRow = candidates.find((row) =>
		TENANT_ALLOWED_ROLES.has(String(row.role || "").toLowerCase()),
	);
	if (!userRow?.company_id) return { error: "No tienes permisos de panel tenant" };

	return { companyId: userRow.company_id, email };
}

async function resolveCustomerPortalSession(
	client: SupabaseClient,
): Promise<TicketAuthContext | { error: string }> {
	const supabase = await createSupabaseServerClient("super-admin");
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user?.email) {
		return { error: "No autenticado" };
	}

	const email = user.email.trim().toLowerCase();
	const membership = await getCustomerMembership({ authUserId: user.id, email });
	if (!membership || !CUSTOMER_PORTAL_ROLES.has(membership.role)) {
		return { error: "No tienes permisos de panel tenant" };
	}

	return { companyId: membership.companyId, email };
}

/** Tenant panel (`tenant` cookie) o portal `/cuenta` (`super-admin` cookie + rol CEO). */
export async function getTicketAuthContext(
	client: SupabaseClient,
): Promise<TicketAuthContext | { error: string }> {
	const tenantCtx = await resolveTenantSession(client);
	if (!("error" in tenantCtx)) return tenantCtx;
	return resolveCustomerPortalSession(client);
}
