import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { supabaseAdmin } from "../infra/supabase-admin";

const ADMIN_PLANS_SELECT_BASE =
	"id,name,name_i18n,price,prices_by_continent,max_branches,max_users,is_public,is_active,features";

const PUBLIC_LANDING_SELECT_BASE =
	"id,name,name_i18n,price,prices_by_continent,max_branches,max_users,features,is_active";

function isPlansOptionalColumnsError(error: PostgrestError | null): boolean {
	const msg = (error?.message ?? "").toLowerCase();
	const hint = (error?.hint ?? "").toLowerCase();
	return (
		msg.includes("marketing_lines") ||
		hint.includes("marketing_lines") ||
		msg.includes("name_i18n") ||
		hint.includes("name_i18n") ||
		msg.includes("marketing_lines_i18n") ||
		hint.includes("marketing_lines_i18n")
	);
}

/** Listado panel super-admin (orden por precio). Reintenta sin `marketing_lines` si la migración aún no está aplicada. */
export async function queryAdminPlansList() {
	const full = `${ADMIN_PLANS_SELECT_BASE},marketing_lines,marketing_lines_i18n`;
	const first = await supabaseAdmin
		.from("plans")
		.select(full)
		.order("price", { ascending: true });

	if (!first.error) {
		return { data: first.data ?? [], error: null as PostgrestError | null };
	}

	if (!isPlansOptionalColumnsError(first.error)) {
		return { data: null, error: first.error };
	}

	const second = await supabaseAdmin
		.from("plans")
		.select(ADMIN_PLANS_SELECT_BASE)
		.order("price", { ascending: true });

	if (second.error) {
		return { data: null, error: second.error };
	}

	return {
		data: (second.data ?? []).map((row) => ({
			...row,
			marketing_lines: [],
			marketing_lines_i18n: {},
			name_i18n: {},
		})),
		error: null as PostgrestError | null,
	};
}

/** Filas para landing pública (`is_public`). */
export async function queryPublicPlansLandingRows() {
	const full = `${PUBLIC_LANDING_SELECT_BASE},marketing_lines,marketing_lines_i18n`;
	const first = await supabaseAdmin
		.from("plans")
		.select(full)
		.eq("is_public", true)
		.order("price", { ascending: true });

	if (!first.error) {
		return { data: first.data ?? [], error: null as PostgrestError | null };
	}

	if (!isPlansOptionalColumnsError(first.error)) {
		return { data: null, error: first.error };
	}

	const second = await supabaseAdmin
		.from("plans")
		.select(PUBLIC_LANDING_SELECT_BASE)
		.eq("is_public", true)
		.order("price", { ascending: true });

	if (second.error) {
		return { data: null, error: second.error };
	}

	return {
		data: (second.data ?? []).map((row) => ({
			...row,
			marketing_lines: [],
			marketing_lines_i18n: {},
			name_i18n: {},
		})),
		error: null as PostgrestError | null,
	};
}

export type AdminPlanMutationResult = {
	data: { id: string }[] | null;
	error: PostgrestError | null;
	/** Se omitieron columnas opcionales de i18n porque aún no existen en la base de datos. */
	optionalColumnsSkipped: boolean;
};

/** UPDATE por id (service role). Si falla por columna `marketing_lines` ausente, reintenta sin ella. */
export async function adminUpdatePlanById(
	id: string,
	updates: Record<string, unknown>
): Promise<AdminPlanMutationResult> {
	const first = await supabaseAdmin.from("plans").update(updates).eq("id", id).select("id");

	if (!first.error) {
		return { data: first.data, error: null, optionalColumnsSkipped: false };
	}

	const hasOptionalColumns =
		Object.prototype.hasOwnProperty.call(updates, "marketing_lines") ||
		Object.prototype.hasOwnProperty.call(updates, "name_i18n") ||
		Object.prototype.hasOwnProperty.call(updates, "marketing_lines_i18n");
	if (!hasOptionalColumns || !isPlansOptionalColumnsError(first.error)) {
		return { data: first.data, error: first.error, optionalColumnsSkipped: false };
	}

	const rest = { ...updates };
	delete (rest as Record<string, unknown>).marketing_lines;
	delete (rest as Record<string, unknown>).name_i18n;
	delete (rest as Record<string, unknown>).marketing_lines_i18n;
	if (Object.keys(rest).length === 0) {
		return { data: null, error: first.error, optionalColumnsSkipped: false };
	}

	const second = await supabaseAdmin.from("plans").update(rest).eq("id", id).select("id");
	if (second.error) {
		return { data: second.data, error: second.error, optionalColumnsSkipped: false };
	}
	return { data: second.data, error: null, optionalColumnsSkipped: true };
}

export type AdminInsertPlanResult = AdminPlanMutationResult & { singleId: string | null };

/** INSERT plan (service role). Si falla por columna `marketing_lines` ausente, reintenta sin ella. */
export async function adminInsertPlan(payload: Record<string, unknown>): Promise<AdminInsertPlanResult> {
	const first = await supabaseAdmin.from("plans").insert(payload).select("id").single();

	if (!first.error) {
		const id = first.data?.id ?? null;
		return {
			data: id ? [{ id }] : null,
			error: null,
			optionalColumnsSkipped: false,
			singleId: id,
		};
	}

	const hasOptionalColumns =
		Object.prototype.hasOwnProperty.call(payload, "marketing_lines") ||
		Object.prototype.hasOwnProperty.call(payload, "name_i18n") ||
		Object.prototype.hasOwnProperty.call(payload, "marketing_lines_i18n");
	if (!hasOptionalColumns || !isPlansOptionalColumnsError(first.error)) {
		return { data: null, error: first.error, optionalColumnsSkipped: false, singleId: null };
	}

	const rest = { ...payload };
	delete (rest as Record<string, unknown>).marketing_lines;
	delete (rest as Record<string, unknown>).name_i18n;
	delete (rest as Record<string, unknown>).marketing_lines_i18n;
	const second = await supabaseAdmin.from("plans").insert(rest).select("id").single();

	if (second.error) {
		return { data: null, error: second.error, optionalColumnsSkipped: false, singleId: null };
	}
	const id = second.data?.id ?? null;
	return {
		data: id ? [{ id }] : null,
		error: null,
		optionalColumnsSkipped: true,
		singleId: id,
	};
}
