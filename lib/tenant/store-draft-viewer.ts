import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveTenantPublicView } from "@/lib/plans/tenant-subscription";
import { getSuperAdminRoleByEmail } from "@/lib/super-admin/account-access";
import { getAppUrl } from "@/lib/tenant/app-url";
import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * ¿Quien abre la tienda en vista previa puede verla? Su dueño (o alguien de su equipo)
 * con la sesión de /cuenta, y el equipo de Gcode. La tienda vive en el mismo dominio que
 * /cuenta (`dominio.com/negocio`), así que la cookie de la sesión llega aquí.
 *
 * Solo se llama para tiendas en vista previa: las abiertas no pagan esta consulta.
 */
export async function canViewStoreDraft(companyId: string): Promise<boolean> {
	try {
		const supabase = await createSupabaseServerClient("super-admin");
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return false;

		const email = String(user.email ?? "").trim().toLowerCase();
		if (email) {
			const role = await getSuperAdminRoleByEmail(email);
			if (role === "super_admin" || role === "support") return true;
		}

		const { data } = await supabaseAdmin
			.from("users")
			.select("id,is_active")
			.eq("auth_user_id", user.id)
			.eq("company_id", companyId)
			.limit(5);
		return ((data ?? []) as Array<{ is_active: boolean | null }>).some((row) => row.is_active !== false);
	} catch {
		return false;
	}
}

/** `open`/`closed` como siempre; una tienda en vista previa es `preview` para su dueño y `coming-soon` para el resto. */
export type StorefrontAccess = "open" | "closed" | "preview" | "coming-soon";

export async function resolveStorefrontAccess(
	company: Parameters<typeof resolveTenantPublicView>[0] & { id?: string | number | null },
): Promise<StorefrontAccess> {
	const view = resolveTenantPublicView(company);
	if (view !== "draft") return view;
	return company?.id != null && (await canViewStoreDraft(String(company.id))) ? "preview" : "coming-soon";
}

/** A dónde lleva «Publicar mi tienda» desde la vista previa. */
export function storeDraftPublishHref(): string {
	return `${getAppUrl()}/cuenta/publicar`;
}

/*
 * Rutas públicas del carrito que reciben un `companyId` o solo un `branchId` (precios,
 * catálogo, cierre del envío, políticas de pago): ¿la tienda vende al público? `open` y
 * `preview` (su dueño, con la sesión de /cuenta) pasan; `coming-soon` y `closed`, no. La
 * barrera real está en la base (`create_public_order_v1` y `create_order_transaction`, ver
 * migrations/20261010_public_order_requires_open_store.sql), que rechaza el pedido también al
 * dueño en vista previa: estas rutas no deben servir precios ni políticas de una tienda sin
 * publicar o cerrada.
 */

/** Código estable del rechazo: lo devuelven estas rutas (`code`) y la RPC (mensaje). */
export const STORE_NOT_OPEN_CODE = "store_not_open";
/** Lo que lee el cliente: el carrito muestra `error` tal cual. */
export const STORE_NOT_OPEN_MESSAGE = "Esta tienda no está recibiendo pedidos por ahora.";

/**
 * Columnas de `companies` que decide el acceso. Solo la marca del borrador, no todo el
 * `theme_config` (pesa: tema, home, panelAccess): estas rutas se llaman en cada carrito.
 */
export const STOREFRONT_ACCESS_COLUMNS = "id,subscription_status,subscription_ends_at,store_draft:theme_config->storeDraft";

export type StorefrontAccessRow = {
	id?: string | number | null;
	subscription_status?: string | null;
	subscription_ends_at?: string | null;
	store_draft?: unknown;
};

/** Acceso a partir de una fila leída con `STOREFRONT_ACCESS_COLUMNS`. */
export function resolveStorefrontAccessFromRow(row: StorefrontAccessRow): Promise<StorefrontAccess> {
	return resolveStorefrontAccess({
		id: row.id ?? null,
		subscription_status: row.subscription_status ?? null,
		subscription_ends_at: row.subscription_ends_at ?? null,
		theme_config: { storeDraft: row.store_draft ?? null },
	});
}

/**
 * `null` si la empresa no existe. Lanza si la base falla: quien llama responde 500 en vez de
 * dar por cerrada una tienda abierta (o al revés).
 */
export async function resolveCompanyStorefrontAccess(companyId: string): Promise<StorefrontAccess | null> {
	const { data, error } = await supabaseAdmin
		.from("companies")
		.select(STOREFRONT_ACCESS_COLUMNS)
		.eq("id", companyId)
		.maybeSingle();
	if (error) throw new Error(`storefront access: ${error.message}`);
	if (!data) return null;
	return resolveStorefrontAccessFromRow(data as StorefrontAccessRow);
}

/** Igual, desde la sucursal. `companyId` es `null` si la sucursal no existe. Lanza si la base falla. */
export async function resolveBranchStorefrontAccess(
	branchId: string,
): Promise<{ companyId: string | null; access: StorefrontAccess | null }> {
	const { data: branch, error } = await supabaseAdmin.from("branches").select("company_id").eq("id", branchId).maybeSingle();
	if (error) throw new Error(`storefront branch: ${error.message}`);
	const companyId = branch?.company_id ? String(branch.company_id) : null;
	if (!companyId) return { companyId: null, access: null };
	return { companyId, access: await resolveCompanyStorefrontAccess(companyId) };
}

/** `open` para todos; `preview` solo lo ve el dueño. Lo demás no toma pedidos. */
export function storefrontTakesOrders(access: StorefrontAccess | null): boolean {
	return access === "open" || access === "preview";
}
