import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const EXPIRATION_DAYS = 7;

export async function POST(req: NextRequest) {
	const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
	if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const cutoff = new Date(Date.now() - EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

	const { error } = await supabaseAdmin
		.from("onboarding_applications")
		.delete()
		.lt("created_at", cutoff.toISOString())
		.eq("status", "pending_verification");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ success: true });
}
