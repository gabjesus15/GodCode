/** @service-role menu-client-session */
import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountRedeemRewardSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { ensureMenuAccountClient } from "@/lib/menu-account/client-link";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import { redeemMenuAccountReward } from "@/lib/menu-account/rewards";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";
import { requireMenuAccount } from "@/lib/menu-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Canjea una recompensa por puntos y devuelve el cupón que entregó. */
export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_rewards_redeem", 10, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountRedeemRewardSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);
		const { account } = await requireMenuAccount(company.id);
		// El canje necesita la ficha: ahí se suman los puntos y a ella queda atado el cupón.
		const clientId = await ensureMenuAccountClient(account);
		const redemption = await redeemMenuAccountReward({ ...account, client_id: clientId }, parsed.data.rewardId);
		return jsonOk({ redemption, points: redemption.pointsLeft }, { status: 201 });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_rewards_redeem");
	}
}
