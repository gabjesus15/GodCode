import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/** @service-role public-read
 *
 * Catálogo de addons activos que pinta el formulario de alta.
 */

export async function GET() {
	const { data, error } = await supabaseAdmin
		.from("addons")
		.select("id,slug,name,description,price_one_time,price_monthly,type,sort_order")
		.eq("is_active", true)
		// Los privados son de una empresa ya creada; en el alta no se ofrecen.
		.is("company_id", null)
		.order("sort_order", { ascending: true });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ data: data ?? [] });
}
