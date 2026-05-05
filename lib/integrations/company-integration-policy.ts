/**
 * Políticas de integración en `companies.integration_settings` (sin secretos).
 */

/** Si es false en JSON, el panel tenant no debe ofrecer la estrategia externa/Uber. Por defecto true (retrocompatible). */
export function isTenantExternalDeliveryAllowed(integrationSettingsRaw: unknown): boolean {
	if (!integrationSettingsRaw || typeof integrationSettingsRaw !== "object" || Array.isArray(integrationSettingsRaw)) {
		return true;
	}
	const o = integrationSettingsRaw as Record<string, unknown>;
	if (o.allowTenantExternalDelivery === false) return false;
	if (o.allow_tenant_external_delivery === false) return false;
	return true;
}
