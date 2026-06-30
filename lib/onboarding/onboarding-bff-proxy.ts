import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/infra/api-guard";
import { proxyToOnboardingBilling } from "./service-proxy";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Reenvía la petición al microservicio onboarding-billing.
 * Si el proxy no aplica (flag off) o falla la configuración, responde 503.
 */
export async function forwardOnboardingBilling(
	req: NextRequest,
	path: string,
): Promise<NextResponse> {
	if (req.method === "GET") {
		const scope = `onboarding_get:${path.replace(/^\//, "").replace(/\//g, "_")}`;
		const limited = await enforceRateLimit(req, scope, 90, 60_000);
		if (limited) return limited;
	} else if (MUTATING_METHODS.has(req.method)) {
		const scope = `onboarding:${path.replace(/^\//, "").replace(/\//g, "_")}`;
		const limited = await enforceRateLimit(req, scope, 30, 60_000);
		if (limited) return limited;
	}

	const res = await proxyToOnboardingBilling(req, path);
	return (
		res ??
		NextResponse.json(
			{
				error:
					"Onboarding no disponible: configura ONBOARDING_BILLING_SERVICE_URL y FF_ONBOARDING_BILLING_EXTERNAL (true o proxy_only).",
			},
			{ status: 503 },
		)
	);
}
