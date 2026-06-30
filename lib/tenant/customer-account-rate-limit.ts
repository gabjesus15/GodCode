import { NextResponse } from "next/server";

import { enforceScopedRateLimit } from "@/lib/infra/api-guard";

export async function assertCustomerAccountRateLimit(
	companyId: string,
	scope: string,
	maxRequests: number,
	windowMs = 60_000,
): Promise<NextResponse | null> {
	return enforceScopedRateLimit(`${scope}:${companyId}`, maxRequests, windowMs);
}
