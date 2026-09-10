import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { flags, getOnboardingBillingBaseUrl } from "@/lib/infra/feature-flags";
import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";
import { startTimer } from "@/lib/infra/logger";

/** @service-role capability-token, public
 *
 * HEALTH_CHECK_SECRET destapa el detalle; sin él solo vivo/degradado, con rate limit.
 */

const startedAt = new Date().toISOString();

function isLoopbackHostname(hostname: string): boolean {
	const value = hostname.trim().toLowerCase();
	return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

function isAuthorized(req: NextRequest): boolean {
  return secretsMatch(
    readBearerSecret(req.headers.get("authorization")),
    process.env.HEALTH_CHECK_SECRET?.trim(),
  );
}

export async function GET(req: NextRequest) {
	const authorized = isAuthorized(req);

	// Sin secreto, cada llamada dispara una consulta a Postgres y —con el proxy
	// externo activo— un fetch de hasta 5 s al microservicio. Eso convierte un
	// endpoint público en amplificador, así que el tráfico anónimo se acota.
	// El sondeo del balanceador cabe de sobra en 30 por minuto e IP.
	if (!authorized) {
		const limited = await enforceRateLimit(req, "system_health", 30, 60_000);
		if (limited) return limited;
	}

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

	if (!authorized) {
		return NextResponse.json(publicBody, { status: statusCode });
	}

	return NextResponse.json(
		{ ...publicBody, started_at: startedAt, checks, proxy },
		{ status: statusCode }
	);
}
