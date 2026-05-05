import { NextResponse } from "next/server";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeIlikeFragment(q: string): string {
	return q
		.trim()
		.slice(0, 64)
		.replace(/\\/g, "")
		.replace(/[%_,]/g, " ")
		.replace(/\s+/g, " ");
}

export async function GET(req: Request) {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json(
			{ error: permission.error ?? "No autorizado", companies: [] },
			{ status: permission.status ?? 403 },
		);
	}

	const url = new URL(req.url);
	const rawQ = url.searchParams.get("q") ?? "";
	const q = rawQ.trim();

	if (q.length < 2) {
		return NextResponse.json({ companies: [] });
	}

	try {
		if (UUID_RE.test(q)) {
			const { data: byId, error: idErr } = await supabaseAdmin
				.from("companies")
				.select("id,name,public_slug,subscription_status")
				.eq("id", q)
				.maybeSingle();

			if (idErr) {
				return NextResponse.json(
					{ error: idErr.message, companies: [] },
					{ status: 500 },
				);
			}

			if (byId) {
				return NextResponse.json({ companies: [byId] });
			}
		}

		const safe = sanitizeIlikeFragment(q);
		if (safe.length < 2) {
			return NextResponse.json({ companies: [] });
		}

		const pattern = `%${safe}%`;
		const { data, error } = await supabaseAdmin
			.from("companies")
			.select("id,name,public_slug,subscription_status")
			.or(`name.ilike.${pattern},public_slug.ilike.${pattern},email.ilike.${pattern}`)
			.order("name", { ascending: true })
			.limit(12);

		if (error) {
			console.error("[companies-search] DB error:", error.message);
			return NextResponse.json(
				{ error: "Error al buscar empresas", companies: [] },
				{ status: 500 },
			);
		}

		return NextResponse.json({ companies: data ?? [] });
	} catch {
		return NextResponse.json(
			{ error: "Error al buscar empresas", companies: [] },
			{ status: 500 },
		);
	}
}
