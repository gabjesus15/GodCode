import "server-only";

import type { NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/**
 * Registro de auditoría (`public.audit_log`, sql/2026-11-02_audit_log.sql).
 *
 * Los triggers de la base ya registran cada cambio en usuarios, empresas, sucursales,
 * datos del negocio, roles y cupones, pero las rutas de servidor escriben con service role
 * y ahí la base no sabe quién fue. Este evento deja el actor: la persona con sesión que
 * pidió el cambio, con su IP y navegador.
 *
 * Nunca guarda datos personales: en `metadata` van nombres de campos y valores no
 * sensibles, no correos, teléfonos ni datos bancarios. Si el registro falla, la acción
 * principal sigue: solo queda el aviso en el log.
 */
export type AuditEvent = {
	companyId: string | null;
	actorAuthUserId: string | null;
	actorRole?: string | null;
	/** `<área>.<objeto>.<verbo>`, por ejemplo `cuenta.team.create`. */
	action: string;
	targetType?: string | null;
	/** Hasta 50; lo demás se recorta. */
	targetIds?: string[];
	metadata?: Record<string, unknown>;
};

const MAX_TARGET_IDS = 50;

/**
 * La cadena entera de x-forwarded-for, no el primer valor: ese lo puede escribir el
 * cliente, y la IP que agregó nuestro primer proxy cambia de posición según el camino.
 * Mismo criterio que el trigger de la base (sql/2026-11-02_audit_log_ip_chain.sql).
 */
function forwardedChain(req: NextRequest): string | null {
	const chain = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
	return chain.trim().slice(0, 200) || null;
}

/** Solo los nombres de los campos que vinieron en el cuerpo, sin sus valores. */
export function auditFieldNames(body: unknown): string[] {
	if (!body || typeof body !== "object" || Array.isArray(body)) return [];
	return Object.keys(body).sort().slice(0, 60);
}

export async function logAuditEvent(req: NextRequest | null, event: AuditEvent): Promise<void> {
	const ids = event.targetIds?.filter(Boolean) ?? [];
	try {
		const { error } = await supabaseAdmin.from("audit_log").insert({
			company_id: event.companyId,
			actor_auth_user_id: event.actorAuthUserId,
			actor_role: event.actorRole ?? null,
			action: event.action.slice(0, 80),
			target_type: event.targetType ?? null,
			target_count: ids.length || null,
			target_ids: ids.length ? ids.slice(0, MAX_TARGET_IDS) : null,
			ip: req ? forwardedChain(req) : null,
			user_agent: req?.headers.get("user-agent")?.slice(0, 300) ?? null,
			request_id: req?.headers.get("x-request-id")?.slice(0, 100) ?? null,
			metadata: event.metadata ?? {},
		});
		if (error) console.warn("[audit_log] insert:", error.message);
	} catch (e) {
		console.warn("[audit_log]", e);
	}
}
