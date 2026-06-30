import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/infra/rate-limiter";
import { logger } from "@/lib/infra/logger";

export function getClientIp(req: NextRequest): string {
	const xf = req.headers.get("x-forwarded-for");
	if (xf) return xf.split(",")[0]?.trim() || "unknown";
	return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function enforceRateLimit(
	req: NextRequest,
	scope: string,
	maxRequests: number,
	windowMs = 60_000,
): Promise<NextResponse | null> {
	const ip = getClientIp(req);
	const key = `${scope}:${ip}`;
	if (!(await checkRateLimit(key, maxRequests, windowMs))) {
		logger.warn("public_api_rate_limit", { scope, ip });
		return NextResponse.json({ error: "Demasiadas peticiones. Intenta en un minuto." }, { status: 429 });
	}
	return null;
}

export async function enforceScopedRateLimit(
	scopeKey: string,
	maxRequests: number,
	windowMs = 60_000,
): Promise<NextResponse | null> {
	if (!(await checkRateLimit(scopeKey, maxRequests, windowMs))) {
		logger.warn("api_rate_limit", { scope: scopeKey });
		return NextResponse.json({ error: "Demasiadas peticiones. Intenta en un minuto." }, { status: 429 });
	}
	return null;
}
