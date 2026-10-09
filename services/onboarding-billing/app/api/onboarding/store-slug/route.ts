import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { isStoreSlugTaken, normalizeStoreSlug, storeSlugProblem, suggestStoreSlug } from "@/lib/onboarding/store-draft-service";

/** @service-role capability-token
 *
 * ¿Está libre este link? Lo pregunta «Crear mi tienda» mientras el dueño escribe. Pide el
 * verification_token para no ser un buscador abierto de tiendas.
 */

function getClientIp(req: NextRequest): string {
	return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function GET(req: NextRequest) {
	const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
	const raw = req.nextUrl.searchParams.get("slug") ?? "";
	if (!token || token.length > 100) return NextResponse.json({ error: "Falta el enlace de tu registro." }, { status: 400 });
	if (await isRateLimited(`onboarding_store_slug:ip:${getClientIp(req)}`, 60, 60_000)) {
		return NextResponse.json({ error: "Demasiadas consultas. Espera un momento." }, { status: 429 });
	}

	const { data: app } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id")
		.eq("verification_token", token)
		.maybeSingle();
	if (!app) return NextResponse.json({ error: "No encontramos tu registro." }, { status: 404 });

	const slug = normalizeStoreSlug(raw);
	const problem = storeSlugProblem(slug);
	if (problem) return NextResponse.json({ slug, available: false, reason: problem });
	if (await isStoreSlugTaken(supabaseAdmin, slug)) {
		return NextResponse.json({ slug, available: false, reason: "taken", suggestion: await suggestStoreSlug(supabaseAdmin, slug) });
	}
	return NextResponse.json({ slug, available: true });
}
