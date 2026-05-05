import { buildAdminAuditLogRow } from "@/lib/super-admin/admin-audit-row";
import { createSupabaseBrowserClient } from "./supabase/client";

interface AuditPayload {
	action: string;
	targetType: string;
	targetId?: string | null;
	companyId?: string | null;
	metadata?: Record<string, unknown>;
}

export async function logAdminAction(payload: AuditPayload) {
	try {
		const supabase = createSupabaseBrowserClient("super-admin");
		const { data: userData } = await supabase.auth.getUser();
		const user = userData.user;

		const row = buildAdminAuditLogRow({
			actorEmail: user?.email ?? null,
			actorId: user?.id ?? null,
			companyId: payload.companyId ?? null,
			action: payload.action,
			targetType: payload.targetType,
			targetId: payload.targetId ?? null,
			metadata: payload.metadata ?? null,
		});

		await supabase.from("admin_audit_logs").insert(row);
	} catch {
		// El logging no debe bloquear la accion principal.
	}
}
