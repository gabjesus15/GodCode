import { NextRequest } from "next/server";

import { forwardOnboardingBilling } from "@/lib/onboarding/onboarding-bff-proxy";

export async function POST(req: NextRequest) {
	return forwardOnboardingBilling(req, "/api/onboarding/coupon");
}

export async function DELETE(req: NextRequest) {
	return forwardOnboardingBilling(req, "/api/onboarding/coupon");
}
