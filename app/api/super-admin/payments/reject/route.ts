import { NextRequest } from "next/server";

import { proxyToOnboardingBilling } from "@/lib/onboarding/service-proxy";

export async function POST(req: NextRequest) {
	const proxied = await proxyToOnboardingBilling(req, "/api/super-admin/payments/reject");
	if (proxied) return proxied;

	return new Response(JSON.stringify({ error: "Onboarding no disponible" }), {
		status: 503,
		headers: { "content-type": "application/json" },
	});
}