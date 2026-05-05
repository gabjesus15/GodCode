import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { flags, getOnboardingBillingBaseUrl } from "@/lib/infra/feature-flags";
import { startTimer } from "@/lib/infra/logger";

const startedAt = new Date().toISOString();

function isLoopbackHostname(hostname: string): boolean {
	const value = hostname.trim().toLowerCase();
	return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
	const checks: Record<string, string> = {};
	let healthy = true;

	try {
		const elapsed = startTimer();
		const { error } = await supabaseAdmin
			.from("companies")
			.select("id")
			.limit(1)
			.maybeSingle();
		checks.database = error ? "unhealthy" : "ok";
		checks.database_latency_ms = String(elapsed());
		if (error) healthy = false;
	} catch {
		checks.database = "unhealthy";
		healthy = false;
	}

	checks.env_supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing";
	checks.env_service_role = process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing";
	checks.env_tenant_domain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ? "ok" : "missing";

	if (
		!process.env.NEXT_PUBLIC_SUPABASE_URL ||
		!process.env.SUPABASE_SERVICE_ROLE_KEY ||
		!process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN
	) {
		healthy = false;
	}

	const proxy: Record<string, string> = {
		feature_flag: flags.ONBOARDING_BILLING_MODE,
	};

	if (flags.ONBOARDING_BILLING_EXTERNAL) {
		const microUrl = getOnboardingBillingBaseUrl();
		proxy.target_url = microUrl || "(not configured)";

		if (!microUrl) {
			proxy.status = "missing_config";
			healthy = false;
		} else {
			let parsedUrl: URL | null = null;
			try {
				parsedUrl = new URL(microUrl);
			} catch {
				proxy.status = "invalid_config";
				healthy = false;
			}

			if (parsedUrl && process.env.NODE_ENV === "production" && isLoopbackHostname(parsedUrl.hostname)) {
				proxy.status = "invalid_config_localhost_in_production";
				healthy = false;
			} else if (parsedUrl) {
				try {
					const elapsed = startTimer();
					const resp = await fetch(`${microUrl}/api/health`, {
						signal: AbortSignal.timeout(5000),
					});
					proxy.status = resp.ok ? "reachable" : `http_${resp.status}`;
					proxy.latency_ms = String(elapsed());
				} catch {
					proxy.status = "unreachable";
					healthy = false;
				}
			}
		}
	}

	const statusCode = healthy ? 200 : 503;
	const publicBody = {
		service: "bff",
		status: healthy ? "healthy" : "degraded",
		timestamp: new Date().toISOString(),
	};

	if (!isAuthorized(req)) {
		return NextResponse.json(publicBody, { status: statusCode });
	}

	return NextResponse.json(
		{ ...publicBody, started_at: startedAt, checks, proxy },
		{ status: statusCode }
	);
}
