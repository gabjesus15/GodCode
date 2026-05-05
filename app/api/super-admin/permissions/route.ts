import { NextRequest, NextResponse } from "next/server";

import { validateAdminRolesOnServer } from "@/utils/admin/server-auth";

interface PermissionPayload {
	allowedRoles?: string[];
}

export async function POST(req: NextRequest) {
	let payload: PermissionPayload = {};
	try {
		payload = (await req.json()) as PermissionPayload;
	} catch {
		payload = {};
	}

	const allowedRoles = Array.isArray(payload.allowedRoles)
		? payload.allowedRoles.filter((role): role is string => typeof role === "string" && role.length > 0)
		: [];

	const result = await validateAdminRolesOnServer(allowedRoles);

	if (!result.ok) {
		return NextResponse.json({ ok: false, error: result.error ?? "No autorizado" }, { status: result.status });
	}

	return NextResponse.json({
		ok: true,
		email: result.email,
		role: result.role,
	});
}

