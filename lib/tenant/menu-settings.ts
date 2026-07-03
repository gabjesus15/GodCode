/** Ajustes del menú público en `companies.integration_settings.menu`. */

export type OrderChannelMode = "both" | "whatsapp_only" | "panel_only";

export type CompanyMenuSettings = {
	cartEnabled: boolean;
	orderChannel: OrderChannelMode;
};

export const DEFAULT_MENU_SETTINGS: CompanyMenuSettings = {
	cartEnabled: true,
	orderChannel: "both",
};

const ORDER_CHANNEL_VALUES: OrderChannelMode[] = ["both", "whatsapp_only", "panel_only"];

export function isOrderChannelMode(value: unknown): value is OrderChannelMode {
	return typeof value === "string" && ORDER_CHANNEL_VALUES.includes(value as OrderChannelMode);
}

export function parseCompanyMenuSettings(raw: unknown): CompanyMenuSettings {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return { ...DEFAULT_MENU_SETTINGS };
	}
	const o = raw as Record<string, unknown>;
	const cartEnabled = o.cartEnabled === false ? false : true;
	const orderChannel = isOrderChannelMode(o.orderChannel) ? o.orderChannel : DEFAULT_MENU_SETTINGS.orderChannel;
	return { cartEnabled, orderChannel };
}

export function extractMenuSettingsFromIntegration(integrationSettings: unknown): CompanyMenuSettings {
	if (
		!integrationSettings ||
		typeof integrationSettings !== "object" ||
		Array.isArray(integrationSettings)
	) {
		return { ...DEFAULT_MENU_SETTINGS };
	}
	return parseCompanyMenuSettings((integrationSettings as Record<string, unknown>).menu);
}

export function normalizeMenuSettingsPatch(
	patch: Partial<CompanyMenuSettings>,
): CompanyMenuSettings {
	const base = { ...DEFAULT_MENU_SETTINGS, ...patch };
	return {
		cartEnabled: base.cartEnabled !== false,
		orderChannel: isOrderChannelMode(base.orderChannel)
			? base.orderChannel
			: DEFAULT_MENU_SETTINGS.orderChannel,
	};
}

export function mergeMenuSettingsIntoIntegration(
	integrationSettings: unknown,
	patch: Partial<CompanyMenuSettings>,
): Record<string, unknown> {
	const base =
		integrationSettings && typeof integrationSettings === "object" && !Array.isArray(integrationSettings)
			? { ...(integrationSettings as Record<string, unknown>) }
			: {};
	const current = parseCompanyMenuSettings(base.menu);
	const next = normalizeMenuSettingsPatch({ ...current, ...patch });
	return { ...base, menu: next };
}

export function planAllowsOnlineOrdering(planFeatures: unknown): boolean {
	if (!planFeatures || typeof planFeatures !== "object" || Array.isArray(planFeatures)) {
		return true;
	}
	return (planFeatures as { online_ordering?: boolean }).online_ordering !== false;
}

export function resolveOnlineOrderingEnabled(
	planFeatures: unknown,
	menuSettings: CompanyMenuSettings,
): boolean {
	return planAllowsOnlineOrdering(planFeatures) && menuSettings.cartEnabled !== false;
}

export function shouldPersistOrderToPanel(orderChannel: OrderChannelMode): boolean {
	return orderChannel === "both" || orderChannel === "panel_only";
}

export function shouldOpenWhatsAppOnCheckout(orderChannel: OrderChannelMode): boolean {
	return orderChannel === "both" || orderChannel === "whatsapp_only";
}

export function requiresOpenShiftForCheckout(orderChannel: OrderChannelMode): boolean {
	return orderChannel === "both" || orderChannel === "panel_only";
}
