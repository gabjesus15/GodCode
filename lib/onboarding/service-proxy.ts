import { NextRequest, NextResponse } from "next/server";
import { flags, getOnboardingBillingBaseUrl, isLoopbackHostname } from "../infra/feature-flags";
import { logger, createRequestContext, startTimer } from "../infra/logger";

const SERVICE_API_KEY = process.env.SERVICE_API_KEY ?? "";
const UPSTREAM_TIMEOUT_MS = 25_000;
/** Lo que ve el cliente cuando el servicio no responde; el detalle queda en el log. */
export const ONBOARDING_SERVICE_UNAVAILABLE = "El registro no está disponible en este momento. Intenta en unos minutos.";

export async function proxyToOnboardingBilling(
	req: NextRequest,
	path: string
): Promise<NextResponse | null> {
	if (!flags.ONBOARDING_BILLING_EXTERNAL) return null;

	const baseUrl = getOnboardingBillingBaseUrl();

	if (!baseUrl) {
		if (flags.ONBOARDING_BILLING_EXTERNAL) {
			return NextResponse.json(
				{ error: "Microservicio no configurado (ONBOARDING_BILLING_SERVICE_URL)" },
				{ status: 503 }
			);
		}
		return null;
	}

	let upstreamOrigin: URL;
	try {
		upstreamOrigin = new URL(baseUrl);
	} catch {
		return NextResponse.json(
			{ error: "Microservicio mal configurado (ONBOARDING_BILLING_SERVICE_URL invalida)" },
			{ status: 503 }
		);
	}

	if (process.env.NODE_ENV === "production" && isLoopbackHostname(upstreamOrigin.hostname)) {
		return NextResponse.json(
			{ error: "Microservicio mal configurado (URL local no valida en produccion)" },
			{ status: 503 }
		);
	}

	const ctx = createRequestContext(path, req.method, "bff-proxy");
	const elapsed = startTimer();

	try {
		const url = new URL(path, upstreamOrigin);
		url.search = req.nextUrl.search;

		const headers = new Headers();
		for (const [key, value] of req.headers.entries()) {
			if (key.toLowerCase() === "host") continue;
			headers.set(key, value);
		}
		headers.set("x-internal-api-key", SERVICE_API_KEY);

		const init: RequestInit = {
			method: req.method,
			headers,
			// Las redirecciones del servicio (p. ej. el regreso de PayPal) son para el
			// navegador: seguirlas aquí devolvía el HTML de destino bajo la URL de la API.
			redirect: "manual",
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
		};

		if (req.method !== "GET" && req.method !== "HEAD") {
			try {
				const bodyText = await req.text();
				if (bodyText) init.body = bodyText;
			} catch {
				/* no body */
			}
		}

		const upstream = await fetch(url.toString(), init);
		const responseBody = await upstream.text();
		const durationMs = elapsed();

		logger.info("proxy_request", ctx, {
			upstream_url: url.toString(),
			upstream_status: upstream.status,
			duration_ms: durationMs,
			mode: flags.ONBOARDING_BILLING_MODE,
		});

		const responseHeaders: Record<string, string> = {
			"content-type": upstream.headers.get("content-type") ?? "application/json",
			"x-proxied-to": "onboarding-billing",
			"x-proxy-duration-ms": String(durationMs),
			"x-proxy-mode": flags.ONBOARDING_BILLING_MODE,
		};
		const location = upstream.headers.get("location");
		if (location && upstream.status >= 300 && upstream.status < 400) {
			responseHeaders.location = location;
		}

		return new NextResponse(responseBody, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: responseHeaders,
		});
	} catch (err) {
		const durationMs = elapsed();
		logger.error("proxy_error", ctx, {
			duration_ms: durationMs,
			mode: flags.ONBOARDING_BILLING_MODE,
			error: err instanceof Error ? err.message : String(err),
		});

		if (flags.ONBOARDING_BILLING_EXTERNAL) {
			return NextResponse.json({ error: ONBOARDING_SERVICE_UNAVAILABLE }, { status: 502 });
		}
		return null;
	}
}
