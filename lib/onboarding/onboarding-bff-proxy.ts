import { NextRequest, NextResponse } from "next/server";

import { proxyToOnboardingBilling } from "./service-proxy";

/**
 * Reenvía la petición al microservicio onboarding-billing.
 * Si el proxy no aplica (flag off) o falla la configuración, responde 503.
 */
export async function forwardOnboardingBilling(
	req: NextRequest,
	path: string,
): Promise<NextResponse> {
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
