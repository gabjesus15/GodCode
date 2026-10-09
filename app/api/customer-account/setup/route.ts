import { NextRequest, NextResponse } from "next/server";

import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { withOwnerSetupMark } from "@/lib/tenant/owner-setup";

/** @service-role customer-account
 *
 * Solo toca `theme_config.ownerSetup` de la empresa de ctx.companyId.
 */

/** `{ action: "finish" | "skip" }`: el dueño terminó «Configura tu tienda» o lo deja para después. */
export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "owner_setup_post", 20, 60_000);
	if (limited) return limited;

	const payload = (await req.json().catch(() => ({}))) as { action?: unknown };
	const action = payload.action === "finish" || payload.action === "skip" ? payload.action : null;
	if (!action) return NextResponse.json({ error: "Acción no válida." }, { status: 400 });

	const { data: company, error: readError } = await supabaseAdmin
		.from("companies")
		.select("theme_config")
		.eq("id", ctx.companyId)
		.maybeSingle();
	if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

	const { error } = await supabaseAdmin
		.from("companies")
		.update({ theme_config: withOwnerSetupMark(company?.theme_config ?? null, action) })
		.eq("id", ctx.companyId);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	return NextResponse.json({ ok: true });
}
