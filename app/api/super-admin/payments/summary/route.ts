import { NextResponse } from "next/server";

import { countPaymentsAwaitingReview } from "@/lib/super-admin/payment-review-queue";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

/** Contador del menú: pagos que esperan que el equipo los valide. */
export async function GET() {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}
	try {
		return NextResponse.json({ pendingCount: await countPaymentsAwaitingReview() });
	} catch {
		return NextResponse.json({ error: "No se pudo contar los pagos" }, { status: 500 });
	}
}
