import { NextResponse } from "next/server";

import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const ATTENTION_STATUSES = ["pending_verification", "email_verified", "form_completed", "payment_pending"] as const;

export async function GET() {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json(
			{ error: permission.error ?? "No autorizado" },
			{ status: permission.status ?? 403 }
		);
	}

	const { count, error } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id", { count: "exact", head: true })
		.in("status", [...ATTENTION_STATUSES]);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ pendingCount: count ?? 0 });
}