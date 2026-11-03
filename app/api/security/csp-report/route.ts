import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/infra/api-guard";
import { logger } from "@/lib/infra/logger";

/**
 * Recibe los reportes de la CSP en modo Report-Only (`proxy.ts`). Solo los deja en
 * el log, para ver qué se bloquearía antes de activarla de verdad.
 *
 * Los navegadores mandan dos formatos: `application/csp-report` (un objeto
 * `csp-report`) y `application/reports+json` (una lista de reportes). La URL que
 * se guarda va sin query string, que puede llevar tokens o datos del cliente.
 */
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_REPORTS = 10;

function stripQuery(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	return value.split(/[?#]/)[0].slice(0, 300);
}

function readReports(body: unknown): Record<string, unknown>[] {
	if (Array.isArray(body)) {
		return body
			.slice(0, MAX_REPORTS)
			.map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>).body : null))
			.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
	}
	const legacy = body && typeof body === "object" ? (body as Record<string, unknown>)["csp-report"] : null;
	return legacy && typeof legacy === "object" ? [legacy as Record<string, unknown>] : [];
}

export async function POST(req: NextRequest) {
	const limited = await enforceRateLimit(req, "csp-report", 30);
	if (limited) return limited;

	const raw = await req.text().catch(() => "");
	if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

	let body: unknown = null;
	try {
		body = JSON.parse(raw);
	} catch {
		return new NextResponse(null, { status: 400 });
	}

	for (const report of readReports(body)) {
		logger.warn("csp.violation", {
			directive: String(report.effectiveDirective ?? report["effective-directive"] ?? report["violated-directive"] ?? "").slice(0, 80),
			blocked_uri: stripQuery(report.blockedURL ?? report["blocked-uri"]),
			document_uri: stripQuery(report.documentURL ?? report["document-uri"]),
		});
	}
	return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
