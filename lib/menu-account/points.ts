import "server-only";

import type { LoyaltyEarnRule } from "@/lib/loyalty/earn-rules-shared";
import { listEarnRules } from "@/lib/loyalty/earn-rules";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";

import { menuAccountErrors } from "./errors";
import type { MenuClientAccountRow } from "./types";

/**
 * Puntos disponibles de la cuenta en su negocio. Los calcula la base
 * (`loyalty_client_balance`): la suma de lo que ganó cada pedido al crearse menos los
 * canjes activos. Es el mismo número que la columna PUNTOS del panel.
 */
export async function getMenuAccountPoints(account: MenuClientAccountRow): Promise<number> {
	if (!account.client_id) return 0;

	const { data, error } = await supabaseAdmin.rpc("loyalty_client_balance", {
		p_company_id: account.company_id,
		p_client_id: account.client_id,
	});
	if (error) {
		logger.error("menu_account_points_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}
	const row = Array.isArray(data) ? data[0] : data;
	return Math.max(0, Number(row?.available) || 0);
}

/**
 * Reglas activas y no vencidas del negocio, para explicarle a la persona cómo suma
 * puntos. Si falla, se devuelve vacío: no es motivo para romper la pantalla.
 */
export async function getMenuAccountEarnRules(account: MenuClientAccountRow): Promise<LoyaltyEarnRule[]> {
	try {
		return await listEarnRules(account.company_id, { onlyActive: true });
	} catch {
		return [];
	}
}
