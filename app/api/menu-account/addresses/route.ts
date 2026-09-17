/** @service-role menu-client-session */
import type { NextRequest } from "next/server";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/response";
import {
	menuAccountAddressCreateSchema,
	menuAccountAddressDeleteSchema,
	menuAccountCompanyQuerySchema,
} from "@/lib/api/schemas/tenant/menu-account";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import {
	addMenuAccountAddress,
	deleteMenuAccountAddress,
	listMenuAccountAddresses,
} from "@/lib/menu-account/activity";
import { ensureMenuAccountClient } from "@/lib/menu-account/client-link";
import { resolveMenuAccountDeliveryOptions } from "@/lib/menu-account/delivery-options";
import { menuAccountErrors } from "@/lib/menu-account/errors";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { resolveCompanyForMenuAccount } from "@/lib/menu-account/company-resolve";
import {
	menuAccountDisabledResponse,
	toMenuAccountErrorResponse,
} from "@/lib/menu-account/route-helpers";
import { requireMenuAccount } from "@/lib/menu-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_addresses", 30, 60_000);
	if (limited) return limited;

	const query = menuAccountCompanyQuerySchema.safeParse({
		companySlug: req.nextUrl.searchParams.get("companySlug"),
	});
	if (!query.success) return jsonError(400, "Datos inválidos.", { code: "validation_error" });

	try {
		const company = await resolveCompanyForMenuAccount(query.data.companySlug);
		const { account } = await requireMenuAccount(company.id);
		const addresses = await listMenuAccountAddresses(account);
		return jsonOk({ addresses });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_addresses");
	}
}

/**
 * Alta manual de una dirección. También las crea el RPC de pedidos al pedir con
 * delivery; ambas terminan en `client_addresses` de la ficha de la cuenta.
 */
export async function POST(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_addresses_create", 10, 60_000);
	if (limited) return limited;

	const parsed = await parseJsonBody(req, menuAccountAddressCreateSchema);
	if (!parsed.ok) return parsed.response;

	try {
		const company = await resolveCompanyForMenuAccount(parsed.data.companySlug);
		const { account } = await requireMenuAccount(company.id);

		// El formulario pide zona o dirección según el negocio; aquí se recalcula con la
		// configuración real para no aceptar una zona inventada ni una dirección donde
		// el negocio solo reparte por zonas.
		const { data: branchRows } = await supabaseAdmin
			.from("branches")
			.select("id, name, delivery_settings")
			.eq("company_id", company.id)
			.eq("is_active", true);
		const options = resolveMenuAccountDeliveryOptions(
			(branchRows ?? []).map((branch) => ({
				id: String(branch.id),
				name: branch.name,
				delivery_settings: branch.delivery_settings,
			})),
		);

		let namedAreaId: string | null = null;
		let addressLine = parsed.data.addressLine;
		if (options.mode === "none") throw menuAccountErrors.deliveryUnavailable();
		if (options.mode === "zones") {
			const zone = options.zones.find((item) => item.id === parsed.data.namedAreaId);
			if (!zone) throw menuAccountErrors.invalidZone();
			namedAreaId = zone.id;
			// Mismo formato que guarda el checkout por zona: la línea es la zona y la calle
			// va en la referencia, que en este modo es obligatoria.
			if (parsed.data.reference.length < 3) throw menuAccountErrors.invalidAddress();
			addressLine = zone.name;
		} else if (addressLine.length < 5) {
			throw menuAccountErrors.invalidAddress();
		}

		const clientId = await ensureMenuAccountClient(account);
		const address = await addMenuAccountAddress(account, clientId, {
			addressLine,
			reference: parsed.data.reference,
			namedAreaId,
		});
		return jsonOk({ address }, { status: 201 });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_addresses_create");
	}
}

/** Borra una dirección de la ficha de la cuenta. */
export async function DELETE(req: NextRequest) {
	const disabled = menuAccountDisabledResponse();
	if (disabled) return disabled;

	const limited = await enforceRateLimit(req, "menu_account_addresses_delete", 20, 60_000);
	if (limited) return limited;

	const query = menuAccountAddressDeleteSchema.safeParse({
		companySlug: req.nextUrl.searchParams.get("companySlug"),
		id: req.nextUrl.searchParams.get("id"),
	});
	if (!query.success) return jsonError(400, "Datos inválidos.", { code: "validation_error" });

	try {
		const company = await resolveCompanyForMenuAccount(query.data.companySlug);
		const { account } = await requireMenuAccount(company.id);
		await deleteMenuAccountAddress(account, query.data.id);
		return jsonOk({ ok: true });
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_addresses_delete");
	}
}
