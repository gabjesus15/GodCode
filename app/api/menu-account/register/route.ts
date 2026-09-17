import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { jsonOk, parseJsonBody } from "@/lib/api/response";
import { menuAccountRegisterSchema } from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit, enforceScopedRateLimit } from "@/lib/infra/api-guard";
import { registerMenuAccount } from "@/lib/menu-account/account-service";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	createCookieCarrier,
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
	withCarriedCookies,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	// Escritura de identidad: más restrictivo que las rutas públicas de lectura.
	const limited = await enforceRateLimit(req, "menu_account_register", 5, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountRegisterSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);

		const companyLimited = await enforceScopedRateLimit(
			`menu_account_register_company:${company.id}`,
			30,
			60_000,
		);
		if (companyLimited) return companyLimited;

		// Si el correo ya es de un cliente, el registro verifica su contraseña: sin un
		// límite por correo, rotar IPs permitiría adivinarla por aquí.
		const emailKey = createHash("sha256").update(parsed.data.email).digest("hex").slice(0, 16);
		const emailLimited = await enforceScopedRateLimit(
			`menu_account_register_email:${emailKey}`,
			5,
			15 * 60_000,
		);
		if (emailLimited) return emailLimited;

		const carrier = createCookieCarrier();
		const result = await registerMenuAccount(
			{
				company,
				document: parsed.data.document,
				email: parsed.data.email,
				password: parsed.data.password,
				fullName: parsed.data.fullName,
				phone: parsed.data.phone,
				preferredBranchId: parsed.data.preferredBranchId ?? null,
			},
			req,
			carrier,
		);

		return withCarriedCookies(
			carrier,
			jsonOk(
				{ status: result.status, account: result.account },
				{ status: result.status === "created" ? 201 : 200 },
			),
		);
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_register");
	}
}
