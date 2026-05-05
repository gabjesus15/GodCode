import { buildAdminAuditLogRow } from "./admin-audit-row";
import { supabaseAdmin } from "../infra/supabase-admin";

export type { AdminAuditLogInsert } from "./admin-audit-row";
export { buildAdminAuditLogRow } from "./admin-audit-row";

export async function logAdminAudit(params: {
	actorEmail: string;
	actorRole?: string | null;
	action: string;
	resourceType?: string | null;
	resourceId?: string | null;
	metadata?: Record<string, unknown> | null;
}): Promise<void> {
	try {
		const row = buildAdminAuditLogRow({
			actorEmail: params.actorEmail,
			actorId: null,
			companyId: null,
			action: params.action,
			targetType: params.resourceType ?? "super_admin_api",
			targetId: params.resourceId ?? null,
			actorRole: params.actorRole ?? null,
			metadata: params.metadata ?? null,
		});
		const { error } = await supabaseAdmin.from("admin_audit_logs").insert(row);
		if (error) {
			console.warn("[admin_audit] insert:", error.message);
		}
	} catch (e) {
		console.warn("[admin_audit]", e);
	}
}
