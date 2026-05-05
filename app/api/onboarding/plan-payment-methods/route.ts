import { NextRequest } from "next/server";

import { forwardOnboardingBilling } from "@/lib/onboarding/onboarding-bff-proxy";

export async function GET(req: NextRequest) {
	return forwardOnboardingBilling(req, "/api/onboarding/plan-payment-methods");
}
