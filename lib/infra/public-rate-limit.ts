import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { jsonWithPublicCors } from "@/lib/infra/api-cors";
import { enforceRateLimit, enforceScopedRateLimit, getClientIp } from "@/lib/infra/api-guard";

const RATE_LIMIT_MESSAGE = "Demasiadas peticiones. Intenta en un minuto.";

export async function assertPublicRateLimit(
	req: NextRequest,
	scope: string,
	maxRequests: number,
	windowMs = 60_000,
): Promise<NextResponse | null> {
	const limited = await enforceRateLimit(req, scope, maxRequests, windowMs);
	if (!limited) return null;
	return jsonWithPublicCors(req, { error: RATE_LIMIT_MESSAGE }, { status: 429 });
}

export async function assertPublicScopedRateLimit(
	req: NextRequest,
	scope: string,
	maxRequests: number,
	windowMs = 60_000,
): Promise<NextResponse | null> {
	const ip = getClientIp(req);
	const limited = await enforceScopedRateLimit(`${scope}:${ip}`, maxRequests, windowMs);
	if (!limited) return null;
	return jsonWithPublicCors(req, { error: RATE_LIMIT_MESSAGE }, { status: 429 });
}

export async function assertJsonRateLimit(
	req: NextRequest,
	scope: string,
	maxRequests: number,
	windowMs = 60_000,
): Promise<NextResponse | null> {
	return enforceRateLimit(req, scope, maxRequests, windowMs);
}
