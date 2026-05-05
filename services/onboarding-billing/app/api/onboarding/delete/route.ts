import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { validateApiKey } from "../../../../lib/api-key-auth";

export async function DELETE(request: Request) {
	const auth = validateApiKey(request as never);
	if (!auth.ok) return auth.response;

	const { id } = await request.json();
	if (!id) {
		return NextResponse.json({ error: "Missing id" }, { status: 400 });
	}

	const { error } = await supabaseAdmin
		.from("onboarding_applications")
		.delete()
		.eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ success: true });
}
