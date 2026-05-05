import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

export async function GET(req: NextRequest) {
	const email = req.nextUrl.searchParams.get("email")?.toLowerCase();
	const plan_id = req.nextUrl.searchParams.get("plan_id");
	if (!email || !plan_id) {
		return NextResponse.json({ used: false, error: "Missing email or plan_id" }, { status: 400 });
	}
	const { data, error } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id")
		.eq("email", email)
		.eq("plan_id", plan_id)
		.limit(1)
		.maybeSingle();
	if (error) {
		return NextResponse.json({ used: false, error: error.message }, { status: 500 });
	}
	return NextResponse.json({ used: !!data });
}
