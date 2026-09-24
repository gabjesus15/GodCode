import { NextResponse } from "next/server";

import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../../utils/admin/server-auth";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { PENDING_APPLICATION_STATUSES } from "@/lib/status/status-labels";

/** @service-role super-admin */

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
		.in("status", [...PENDING_APPLICATION_STATUSES]);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ pendingCount: count ?? 0 });
}