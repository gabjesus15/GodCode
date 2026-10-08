import { NextRequest, NextResponse } from "next/server";

import {
	deleteCompanySender,
	getCompanyEffectiveDomain,
	getCompanySender,
	saveCompanySender,
} from "@/lib/email/company-sender";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account */

/**
 * Resend propio de la empresa para los cupones por correo, desde la cuenta del CEO
 * (/cuenta › Correo de cupones). El panel del negocio solo lo lee. Sin dominio propio
 * vigente los cupones salen por el Resend de GodCode y no hay nada que configurar.
 * La empresa sale siempre de la sesión, nunca del cuerpo.
 */

const NO_DOMAIN_ERROR = "Tu negocio no tiene dominio propio: los cupones salen desde GodCode con tu nombre.";

async function requireCeo() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return { ctx: null, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
	if (ctx.role !== "ceo") {
		return {
			ctx: null,
			response: NextResponse.json({ error: "No autorizado. Solo el CEO configura el correo de los cupones." }, { status: 403 }),
		};
	}
	return { ctx, response: null };
}

export async function GET() {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "email_sender_get", 60, 60_000);
	if (limited) return limited;

	try {
		const [company, sender] = await Promise.all([
			getCompanyEffectiveDomain(ctx.companyId),
			getCompanySender(ctx.companyId),
		]);
		return NextResponse.json({ customDomain: company.customDomain, sender });
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo leer" }, { status: 500 });
	}
}

export async function PUT(req: NextRequest) {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	// Cada guardado manda un correo de prueba por Resend.
	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "email_sender_put", 10, 10 * 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

	let customDomain: string | null;
	try {
		customDomain = (await getCompanyEffectiveDomain(ctx.companyId)).customDomain;
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo leer" }, { status: 500 });
	}
	if (!customDomain) return NextResponse.json({ error: NO_DOMAIN_ERROR }, { status: 400 });

	const result = await saveCompanySender({
		companyId: ctx.companyId,
		apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
		fromEmail: typeof body.fromEmail === "string" ? body.fromEmail : "",
		fromName: typeof body.fromName === "string" ? body.fromName : "",
		replyTo: typeof body.replyTo === "string" ? body.replyTo : "",
		testTo: ctx.email,
		actorEmail: ctx.email,
	});
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

	return NextResponse.json({ ok: true, testSentTo: ctx.email, sender: await getCompanySender(ctx.companyId) });
}

export async function DELETE() {
	const { ctx, response } = await requireCeo();
	if (!ctx) return response;

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "email_sender_delete", 10, 10 * 60_000);
	if (limited) return limited;

	try {
		await deleteCompanySender(ctx.companyId);
	} catch (err) {
		return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo quitar" }, { status: 500 });
	}
	return NextResponse.json({ ok: true });
}
