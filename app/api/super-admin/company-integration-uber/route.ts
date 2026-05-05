import { NextRequest, NextResponse } from "next/server";

import { isTenantExternalDeliveryAllowed } from "@/lib/integrations/company-integration-policy";
import {
	mergeCompanyIntegrationUberPatch,
	parseCompanyIntegrationSettings,
} from "@/lib/integrations/company-integration-settings";
import { encryptUberClientSecret } from "@/lib/integrations/integration-secrets";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	SAAS_MUTATE_ROLES,
	validateAdminRolesOnServer,
} from "../../../../utils/admin/server-auth";

interface Body {
	companyId?: unknown;
	clientId?: unknown;
	customerId?: unknown;
	clientSecret?: unknown;
	clearClientSecret?: unknown;
	/** Si false, el panel del negocio no muestra la opción “Consultar / Uber” por sucursal. */
	allowTenantExternalDelivery?: unknown;
}

export async function PATCH(req: NextRequest) {
	const auth = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!auth.ok) {
		return NextResponse.json(
			{ ok: false, error: auth.error ?? "No autorizado" },
			{ status: auth.status },
		);
	}

	let body: Body = {};
	try {
		body = (await req.json()) as Body;
	} catch {
		return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
	}

	const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
	const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
	const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
	const clientSecretRaw =
		typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
	const clearClientSecret = body.clearClientSecret === true;
	const allowTenantRaw = body.allowTenantExternalDelivery;
	const hasUberPayload =
		typeof body.clientId === "string" ||
		typeof body.customerId === "string" ||
		typeof body.clientSecret === "string" ||
		body.clearClientSecret === true;
	const patchAllowOnly = typeof allowTenantRaw === "boolean" && !hasUberPayload;

	if (!companyId) {
		return NextResponse.json({ ok: false, error: "Falta companyId" }, { status: 400 });
	}

	const { data: row, error: loadErr } = await supabaseAdmin
		.from("companies")
		.select("id, integration_settings")
		.eq("id", companyId)
		.maybeSingle();

	if (loadErr || !row) {
		return NextResponse.json(
			{ ok: false, error: "Empresa no encontrada" },
			{ status: 404 },
		);
	}

	if (!patchAllowOnly && !hasUberPayload && typeof allowTenantRaw !== "boolean") {
		return NextResponse.json(
			{ ok: false, error: "Nada que actualizar" },
			{ status: 400 },
		);
	}

	const prev =
		row.integration_settings &&
		typeof row.integration_settings === "object" &&
		!Array.isArray(row.integration_settings)
			? { ...(row.integration_settings as Record<string, unknown>) }
			: {};

	let nextSettings: Record<string, unknown>;

	if (patchAllowOnly) {
		nextSettings = { ...prev, allowTenantExternalDelivery: allowTenantRaw };
	} else if (clientSecretRaw.length > 0) {
		const enc = encryptUberClientSecret(clientSecretRaw);
		if (!enc.ok) {
			return NextResponse.json({ ok: false, error: enc.message }, { status: 400 });
		}
		nextSettings = mergeCompanyIntegrationUberPatch(row.integration_settings, {
			clientId,
			customerId,
			clientSecretEncrypted: enc.ciphertext,
			clearClientSecret: false,
		});
		if (typeof allowTenantRaw === "boolean") {
			nextSettings.allowTenantExternalDelivery = allowTenantRaw;
		}
	} else {
		nextSettings = mergeCompanyIntegrationUberPatch(row.integration_settings, {
			clientId,
			customerId,
			clearClientSecret,
		});
		if (typeof allowTenantRaw === "boolean") {
			nextSettings.allowTenantExternalDelivery = allowTenantRaw;
		}
	}

	const { error: upErr } = await supabaseAdmin
		.from("companies")
		.update({ integration_settings: nextSettings })
		.eq("id", companyId);

	if (upErr) {
		return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
	}

	const parsed = parseCompanyIntegrationSettings(nextSettings);
	return NextResponse.json({
		ok: true,
		uberClientId: parsed.uber?.clientId ?? "",
		uberCustomerId: parsed.uber?.customerId ?? "",
		hasClientSecret: Boolean(parsed.uber?.clientSecretEncrypted),
		allowTenantExternalDelivery: isTenantExternalDeliveryAllowed(nextSettings),
	});
}
