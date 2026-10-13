import { NextRequest, NextResponse } from "next/server";

import {
	ADDON_REQUEST_FIELDS,
	MAX_OPEN_ADDON_REQUESTS,
	OPEN_ADDON_REQUEST_STATUSES,
	nextStatusForOwnerAction,
	parseAddonRequestDraft,
	toAddonRequestSummary,
	type AddonRequestRow,
	type OwnerAddonRequestAction,
} from "@/lib/billing/addon-requests";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Pedidos de extras a medida desde /cuenta › Plan y extras. El dueño los crea, cancela,
 * rechaza o acepta la cotización; pagar es el flujo de siempre (`/api/customer-account/addons`
 * con el extra privado que el equipo creó al cotizar).
 */

const OWNER_ACTIONS = new Set<OwnerAddonRequestAction>(["cancel", "reject_quote", "accept"]);

async function listRequests(companyId: string) {
	const { data, error } = await supabaseAdmin
		.from("addon_requests")
		.select(ADDON_REQUEST_FIELDS)
		.eq("company_id", companyId)
		.order("created_at", { ascending: false })
		.limit(50);
	return { data: ((data ?? []) as AddonRequestRow[]).map(toAddonRequestSummary), error };
}

export async function GET() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "addon_requests_get", 40, 60_000);
	if (limited) return limited;

	const { data, error } = await listRequests(ctx.companyId);
	if (error) return NextResponse.json({ error: "No se pudieron leer tus pedidos." }, { status: 500 });
	return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "addon_requests_post", 5, 60_000);
	if (limited) return limited;

	const parsed = parseAddonRequestDraft(await req.json().catch(() => ({})));
	if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

	const { count } = await supabaseAdmin
		.from("addon_requests")
		.select("id", { count: "exact", head: true })
		.eq("company_id", ctx.companyId)
		.in("status", OPEN_ADDON_REQUEST_STATUSES);
	if ((count ?? 0) >= MAX_OPEN_ADDON_REQUESTS) {
		return NextResponse.json(
			{ error: `Puedes tener hasta ${MAX_OPEN_ADDON_REQUESTS} pedidos en curso. Espera a que terminemos alguno o cancela uno.` },
			{ status: 409 },
		);
	}

	const { error } = await supabaseAdmin.from("addon_requests").insert({
		company_id: ctx.companyId,
		requested_by_email: ctx.email,
		title: parsed.draft.title,
		description: parsed.draft.description,
		urgency: parsed.draft.urgency,
	});
	if (error) return NextResponse.json({ error: "No se pudo enviar tu pedido." }, { status: 500 });

	const { data } = await listRequests(ctx.companyId);
	return NextResponse.json({ ok: true, requests: data ?? [], message: "Recibimos tu pedido. Te respondemos con un precio." });
}

export async function PATCH(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "addon_requests_patch", 20, 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
	const id = String(body.id ?? "").trim();
	const action = body.action as OwnerAddonRequestAction;
	if (!id || !OWNER_ACTIONS.has(action)) return NextResponse.json({ error: "Acción no válida." }, { status: 400 });

	const { data: current } = await supabaseAdmin
		.from("addon_requests")
		.select("id,status,addon_id")
		.eq("id", id)
		.eq("company_id", ctx.companyId)
		.maybeSingle();
	if (!current) return NextResponse.json({ error: "No encontramos ese pedido." }, { status: 404 });

	const next = nextStatusForOwnerAction(current.status, action);
	if (!next.ok) return NextResponse.json({ error: next.error }, { status: 409 });
	if (action === "accept" && !current.addon_id) {
		return NextResponse.json({ error: "Este pedido todavía no tiene precio." }, { status: 409 });
	}

	if (next.status !== current.status) {
		const { error } = await supabaseAdmin
			.from("addon_requests")
			.update({ status: next.status })
			.eq("id", id)
			.eq("company_id", ctx.companyId)
			// Si otra pestaña lo cambió entretanto, no se pisa.
			.eq("status", current.status);
		if (error) return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 500 });
	}

	const { data } = await listRequests(ctx.companyId);
	return NextResponse.json({ ok: true, addonId: current.addon_id, requests: data ?? [] });
}
