import type { Json } from "../../types/supabase-database";

/** Fila insertable en `admin_audit_logs` (servidor y cliente comparten forma). */
export type AdminAuditLogInsert = {
	actor_email: string | null;
	actor_id: string | null;
	company_id: string | null;
	action: string;
	target_type: string;
	target_id: string | null;
	metadata: Json;
};

export function buildAdminAuditLogRow(params: {
	actorEmail: string | null | undefined;
	actorId?: string | null;
	companyId?: string | null;
	action: string;
	targetType: string;
	targetId?: string | null;
	actorRole?: string | null;
	metadata?: Record<string, unknown> | null;
}): AdminAuditLogInsert {
	const email = params.actorEmail?.trim().toLowerCase() ?? null;
	const meta: Record<string, unknown> = { ...(params.metadata ?? {}) };
	if (params.actorRole) {
		meta.actor_role = params.actorRole;
	}
	return {
		actor_email: email,
		actor_id: params.actorId ?? null,
		company_id: params.companyId ?? null,
		action: params.action,
		target_type: params.targetType.slice(0, 120),
		target_id: params.targetId ?? null,
		metadata: meta as Json,
	};
}
