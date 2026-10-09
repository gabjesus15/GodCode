import type { SupabaseClient } from "@supabase/supabase-js";

import { isStoreDraftPending, readStoreDraft, STORE_DRAFT_PURGE_DAY, storeDraftAgeDays } from "@/lib/tenant/store-draft";

import { openStoreDraft, requestTenantRevalidation } from "./store-draft-service";

/**
 * Lo que el cron diario hace con las tiendas en vista previa («Arma y paga»):
 * - Cerrar la marca de las que ya se pagaron y quedaron a medias (activas sin `openedAt`):
 *   sin eso el dueño no recibe el acceso al panel que trae su plan.
 * - Borrar las que llevan 30 días sin publicarse, para liberar el link. Antes se avisa a
 *   los 23 días (`lifecycle-plan`). Una con el pago en revisión no se borra.
 *
 * STORE_DRAFT_PURGE: `dry-run` (por defecto: solo cuenta lo que borraría), `on` u `off`.
 * El aviso de los 23 días sale solo con `on`: no se avisa de un borrado que no va a pasar.
 */

export type StoreDraftPurgeMode = "on" | "dry-run" | "off";

export function storeDraftPurgeMode(): StoreDraftPurgeMode {
	const raw = String(process.env.STORE_DRAFT_PURGE ?? "").trim().toLowerCase();
	if (["on", "true", "1", "yes"].includes(raw)) return "on";
	if (["off", "false", "0", "no"].includes(raw)) return "off";
	return "dry-run";
}

export type PendingStoreDraft = {
	companyId: string;
	slug: string | null;
	country: string | null;
	since: string;
	/** Comprobante del alta en revisión (Venezuela, transferencia): se publica sola al validarlo. */
	paymentInReview: boolean;
};

const MAX_DRAFTS = 1000;
const ID_CHUNK = 100;

/** Tiendas en vista previa sin publicar, con lo que hace falta para avisar o borrar. */
export async function loadPendingStoreDrafts(client: SupabaseClient): Promise<{ drafts: PendingStoreDraft[]; error?: string }> {
	const { data, error } = await client
		.from("companies")
		.select("id,public_slug,country,subscription_status,store_draft:theme_config->storeDraft")
		.eq("subscription_status", "trial")
		.is("subscription_ends_at", null)
		.not("theme_config->storeDraft", "is", null)
		.limit(MAX_DRAFTS);
	if (error) return { drafts: [], error: `borradores: ${error.message}` };

	const rows = ((data ?? []) as Array<{ id: string; public_slug: string | null; country: string | null; subscription_status: string | null; store_draft: unknown }>)
		.map((row) => ({ row, theme: { storeDraft: row.store_draft } }))
		.filter(({ row, theme }) => isStoreDraftPending({ subscription_status: row.subscription_status, theme_config: theme }));
	if (rows.length === 0) return { drafts: [] };

	const inReview = new Set<string>();
	const ids = rows.map(({ row }) => String(row.id));
	for (let i = 0; i < ids.length; i += ID_CHUNK) {
		const { data: apps, error: appsError } = await client
			.from("onboarding_applications")
			.select("company_id,payment_status,payment_reference_url")
			.in("company_id", ids.slice(i, i + ID_CHUNK));
		if (appsError) return { drafts: [], error: `solicitudes de borradores: ${appsError.message}` };
		for (const app of (apps ?? []) as Array<{ company_id: string | null; payment_status: string | null; payment_reference_url: string | null }>) {
			if (app.company_id && app.payment_status === "pending_validation" && String(app.payment_reference_url ?? "").trim()) {
				inReview.add(app.company_id);
			}
		}
	}

	return {
		drafts: rows.map(({ row, theme }) => ({
			companyId: String(row.id),
			slug: row.public_slug ?? null,
			country: row.country ?? null,
			since: readStoreDraft(theme)?.since ?? "",
			paymentInReview: inReview.has(String(row.id)),
		})),
	};
}

export type StoreDraftJobsSummary = {
	purge_mode: StoreDraftPurgeMode;
	healed: number;
	/** Borradores de 30 días o más (en `dry-run`, los que se borrarían). */
	purge_due: number;
	purged: number;
	errors: string[];
};

/** Tiendas pagadas cuya marca quedó sin cerrar: se abren con el plan que tienen. */
async function healOpenedDrafts(client: SupabaseClient, now: Date, summary: StoreDraftJobsSummary): Promise<void> {
	const { data, error } = await client
		.from("companies")
		.select("id,plan_id")
		.eq("subscription_status", "active")
		.not("theme_config->storeDraft", "is", null)
		.is("theme_config->storeDraft->>openedAt", null)
		.limit(200);
	if (error) {
		summary.errors.push(`tiendas por abrir: ${error.message}`);
		return;
	}
	for (const row of (data ?? []) as Array<{ id: string; plan_id: string | null }>) {
		const result = await openStoreDraft(client, { companyId: String(row.id), planId: row.plan_id, now });
		if (result.opened) summary.healed += 1;
	}
}

/**
 * Borra una tienda en vista previa: la empresa (con lo que cuelga de ella), sus filas de
 * `users` y la cuenta de Auth si no es dueño de otro local. La solicitud vuelve a «correo
 * confirmado» sin empresa: si regresa, «Retomar mi registro» lo lleva a crear su tienda de
 * nuevo (no se toca `updated_at`, así no recibe los avisos de alta a medias). Vuelve a leer
 * la empresa antes: si se pagó entre medio, no la toca.
 */
export async function purgeStoreDraft(client: SupabaseClient, companyId: string, now = new Date()): Promise<{ ok: boolean; error?: string }> {
	const { data: company } = await client
		.from("companies")
		.select("id,public_slug,subscription_status,theme_config")
		.eq("id", companyId)
		.maybeSingle();
	if (!company || !isStoreDraftPending(company)) return { ok: false, error: "Ya no es una tienda en vista previa" };
	const draft = readStoreDraft(company.theme_config);
	if (!draft || storeDraftAgeDays(draft, now) < STORE_DRAFT_PURGE_DAY) return { ok: false, error: "Todavía no cumple 30 días" };

	const { data: members } = await client.from("users").select("id,auth_user_id").eq("company_id", companyId);
	const memberRows = (members ?? []) as Array<{ id: string; auth_user_id: string | null }>;
	const authIds = [...new Set(memberRows.map((m) => m.auth_user_id).filter((id): id is string => Boolean(id)))];
	const { data: apps } = await client.from("onboarding_applications").select("id,status").eq("company_id", companyId);
	const appRows = (apps ?? []) as Array<{ id: string; status: string | null }>;

	// La solicitud se suelta primero: si no, su referencia a la empresa impide borrarla.
	if (appRows.length > 0) {
		await client
			.from("onboarding_applications")
			.update({ status: "email_verified", company_id: null })
			.in("id", appRows.map((a) => a.id));
	}

	let { error: companyError } = await client.from("companies").delete().eq("id", companyId);
	if (companyError) {
		// Sin borrado en cascada: primero lo que cuelga de la empresa.
		if (memberRows.length > 0) await client.from("users").delete().in("id", memberRows.map((m) => m.id));
		await client.from("business_info").delete().eq("company_id", companyId);
		await client.from("branches").delete().eq("company_id", companyId);
		({ error: companyError } = await client.from("companies").delete().eq("id", companyId));
	}
	if (companyError) {
		for (const app of appRows) {
			await client.from("onboarding_applications").update({ status: app.status, company_id: companyId }).eq("id", app.id);
		}
		return { ok: false, error: `empresa: ${companyError.message}` };
	}
	if (memberRows.length > 0) await client.from("users").delete().in("id", memberRows.map((m) => m.id));

	for (const authId of authIds) {
		const { count } = await client.from("users").select("id", { count: "exact", head: true }).eq("auth_user_id", authId);
		if ((count ?? 0) === 0) await client.auth.admin.deleteUser(authId).catch(() => undefined);
	}

	await requestTenantRevalidation(companyId, (company.public_slug as string | null) ?? null);
	return { ok: true };
}

export async function runStoreDraftJobs(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
	mode?: StoreDraftPurgeMode;
	deadlineMs?: number;
}): Promise<StoreDraftJobsSummary> {
	const client = params.supabaseAdmin;
	const now = params.now ?? new Date();
	const mode = params.mode ?? storeDraftPurgeMode();
	const summary: StoreDraftJobsSummary = { purge_mode: mode, healed: 0, purge_due: 0, purged: 0, errors: [] };

	await healOpenedDrafts(client, now, summary);
	if (mode === "off") return summary;

	const { drafts, error } = await loadPendingStoreDrafts(client);
	if (error) summary.errors.push(error);
	const due = drafts.filter((d) => !d.paymentInReview && d.since && storeDraftAgeDays(d, now) >= STORE_DRAFT_PURGE_DAY);
	summary.purge_due = due.length;
	if (mode !== "on") return summary;

	for (const draft of due) {
		if (params.deadlineMs != null && Date.now() > params.deadlineMs) break;
		const result = await purgeStoreDraft(client, draft.companyId, now);
		if (result.ok) summary.purged += 1;
		else if (result.error) summary.errors.push(`${draft.slug ?? draft.companyId}: ${result.error}`);
	}
	return summary;
}
