/** Forma de `companies.integration_settings` (sin lógica de servidor). */

export type CompanyUberIntegrationStored = {
	clientId?: string;
	clientSecretEncrypted?: string;
	customerId?: string;
};

export type CompanyIntegrationSettingsShape = {
	uber?: CompanyUberIntegrationStored;
};

export function parseCompanyIntegrationSettingsJson(
	raw: unknown,
): CompanyIntegrationSettingsShape {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {};
	}
	const o = raw as Record<string, unknown>;
	const uberRaw = o.uber;
	if (!uberRaw || typeof uberRaw !== "object" || Array.isArray(uberRaw)) {
		return {};
	}
	const u = uberRaw as Record<string, unknown>;
	const clientId = typeof u.clientId === "string" ? u.clientId.trim().slice(0, 256) : "";
	const customerId = typeof u.customerId === "string" ? u.customerId.trim().slice(0, 256) : "";
	const clientSecretEncrypted =
		typeof u.clientSecretEncrypted === "string" ? u.clientSecretEncrypted.trim() : "";
	const uber: CompanyUberIntegrationStored = {};
	if (clientId) uber.clientId = clientId;
	if (customerId) uber.customerId = customerId;
	if (clientSecretEncrypted) uber.clientSecretEncrypted = clientSecretEncrypted;
	return Object.keys(uber).length > 0 ? { uber } : {};
}
