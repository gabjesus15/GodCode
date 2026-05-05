import "server-only";

import {
	parseCompanyIntegrationSettingsJson,
	type CompanyIntegrationSettingsShape,
	type CompanyUberIntegrationStored,
} from "./company-integration-json";
import { decryptUberClientSecret } from "./integration-secrets";

export type { CompanyIntegrationSettingsShape, CompanyUberIntegrationStored };

export function parseCompanyIntegrationSettings(
	raw: unknown,
): CompanyIntegrationSettingsShape {
	return parseCompanyIntegrationSettingsJson(raw);
}

/**
 * Credenciales OAuth Uber para una empresa: primero BD (cifrado), si no hay, env global.
 */
export function resolveUberOAuthCredentials(params: {
	integrationSettings: unknown;
}): { ok: true; clientId: string; clientSecret: string; customerId?: string } | { ok: false; message: string } {
	const parsed = parseCompanyIntegrationSettings(params.integrationSettings);
	const fromDbId = parsed.uber?.clientId?.trim() ?? "";
	const fromDbCustomerId = parsed.uber?.customerId?.trim() ?? "";
	const enc = parsed.uber?.clientSecretEncrypted?.trim() ?? "";

	if (fromDbId && enc) {
		const secret = decryptUberClientSecret(enc);
		if (!secret) {
			return {
				ok: false,
				message:
					"No se pudo descifrar el Client Secret de Uber (revisa UBER_SECRETS_ENCRYPTION_KEY o vuelve a guardar el secret).",
			};
		}
		return {
			ok: true,
			clientId: fromDbId,
			clientSecret: secret,
			customerId: fromDbCustomerId || undefined,
		};
	}

	const envId = process.env.UBER_CLIENT_ID?.trim() ?? "";
	const envSecret = process.env.UBER_CLIENT_SECRET?.trim() ?? "";
	const envCustomerId = process.env.UBER_CUSTOMER_ID?.trim() ?? "";

	if (envId && envSecret) {
		return {
			ok: true,
			clientId: envId,
			clientSecret: envSecret,
			customerId: envCustomerId || undefined,
		};
	}

	return {
		ok: false,
		message:
			"Uber Direct: la empresa no tiene Client ID/Secret configurados y no hay UBER_CLIENT_ID / UBER_CLIENT_SECRET en el servidor.",
	};
}

export function mergeCompanyIntegrationUberPatch(
	prev: unknown,
	patch: {
		clientId: string;
		customerId?: string;
		clientSecretEncrypted?: string | null;
		clearClientSecret?: boolean;
	},
): Record<string, unknown> {
	const base =
		prev && typeof prev === "object" && !Array.isArray(prev)
			? { ...(prev as Record<string, unknown>) }
			: {};
	const next = { ...base };
	const prevUber =
		next.uber && typeof next.uber === "object" && !Array.isArray(next.uber)
			? { ...(next.uber as Record<string, unknown>) }
			: {};
	const uber: Record<string, unknown> = { ...prevUber };

	const id = patch.clientId.trim().slice(0, 256);
	if (id) uber.clientId = id;
	else delete uber.clientId;

	const customerId = patch.customerId?.trim().slice(0, 256) ?? "";
	if (customerId) uber.customerId = customerId;
	else delete uber.customerId;

	if (patch.clearClientSecret) {
		delete uber.clientSecretEncrypted;
	} else if (typeof patch.clientSecretEncrypted === "string" && patch.clientSecretEncrypted) {
		uber.clientSecretEncrypted = patch.clientSecretEncrypted;
	}

	if (Object.keys(uber).length === 0) {
		delete next.uber;
	} else {
		next.uber = uber;
	}
	return next;
}
