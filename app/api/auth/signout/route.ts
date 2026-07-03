import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { signOutScopesOnResponse } from "@/lib/auth/sign-out-server";
import { enforceRateLimit } from "@/lib/infra/api-guard";

export async function POST(request: NextRequest) {
	const limited = await enforceRateLimit(request, "auth_signout", 30, 60_000);
	if (limited) return limited;

	const response = NextResponse.redirect(new URL("/login", request.url), 303);
	await signOutScopesOnResponse(request, response);
	return response;
}
