"use client";

import { useCallback, useEffect, useState } from "react";

import type { CompanyMenuSettings, OrderChannelMode } from "@/lib/tenant/menu-settings";
import { DEFAULT_MENU_SETTINGS } from "@/lib/tenant/menu-settings";

export type UseMenuSettingsReturn = {
	menuSettingsLoading: boolean;
	menuSettingsSaving: boolean;
	menuSettingsError: string | null;
	menuSettingsOk: string | null;
	menuSettings: CompanyMenuSettings;
	planAllowsOnlineOrdering: boolean;
	setCartEnabled: (enabled: boolean) => void;
	setOrderChannel: (channel: OrderChannelMode) => void;
	saveMenuSettings: () => Promise<boolean>;
	reloadMenuSettings: () => Promise<void>;
	menuSettingsDirty: boolean;
};

export function useMenuSettings(enabled: boolean): UseMenuSettingsReturn {
	const [menuSettingsLoading, setMenuSettingsLoading] = useState(false);
	const [menuSettingsSaving, setMenuSettingsSaving] = useState(false);
	const [menuSettingsError, setMenuSettingsError] = useState<string | null>(null);
	const [menuSettingsOk, setMenuSettingsOk] = useState<string | null>(null);
	const [menuSettings, setMenuSettings] = useState<CompanyMenuSettings>({ ...DEFAULT_MENU_SETTINGS });
	const [savedMenuSettings, setSavedMenuSettings] = useState<CompanyMenuSettings>({ ...DEFAULT_MENU_SETTINGS });
	const [planAllowsOnlineOrdering, setPlanAllowsOnlineOrdering] = useState(true);

	const reloadMenuSettings = useCallback(async () => {
		setMenuSettingsLoading(true);
		setMenuSettingsError(null);
		try {
			const res = await fetch("/api/customer-account/menu-settings", { cache: "no-store" });
			const data = (await res.json().catch(() => ({}))) as {
				menuSettings?: CompanyMenuSettings;
				planAllowsOnlineOrdering?: boolean;
				error?: string;
			};
			if (!res.ok) {
				setMenuSettingsError(data.error || "No se pudo cargar la configuración del menú.");
				return;
			}
			const next = data.menuSettings ?? { ...DEFAULT_MENU_SETTINGS };
			setMenuSettings(next);
			setSavedMenuSettings(next);
			setPlanAllowsOnlineOrdering(data.planAllowsOnlineOrdering !== false);
		} catch {
			setMenuSettingsError("No se pudo cargar la configuración del menú.");
		} finally {
			setMenuSettingsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!enabled) return;
		void reloadMenuSettings();
	}, [enabled, reloadMenuSettings]);

	const setCartEnabled = useCallback((enabled: boolean) => {
		setMenuSettingsOk(null);
		setMenuSettings((prev) => ({ ...prev, cartEnabled: enabled }));
	}, []);

	const setOrderChannel = useCallback((channel: OrderChannelMode) => {
		setMenuSettingsOk(null);
		setMenuSettings((prev) => ({ ...prev, orderChannel: channel }));
	}, []);

	const menuSettingsDirty =
		menuSettings.cartEnabled !== savedMenuSettings.cartEnabled ||
		menuSettings.orderChannel !== savedMenuSettings.orderChannel;

	const saveMenuSettings = useCallback(async () => {
		setMenuSettingsSaving(true);
		setMenuSettingsError(null);
		setMenuSettingsOk(null);
		try {
			const res = await fetch("/api/customer-account/menu-settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(menuSettings),
			});
			const data = (await res.json().catch(() => ({}))) as {
				menuSettings?: CompanyMenuSettings;
				planAllowsOnlineOrdering?: boolean;
				error?: string;
			};
			if (!res.ok) {
				setMenuSettingsError(data.error || "No se pudo guardar la configuración.");
				return false;
			}
			const next = data.menuSettings ?? menuSettings;
			setMenuSettings(next);
			setSavedMenuSettings(next);
			setPlanAllowsOnlineOrdering(data.planAllowsOnlineOrdering !== false);
			setMenuSettingsOk("Configuración guardada.");
			return true;
		} catch {
			setMenuSettingsError("No se pudo guardar la configuración.");
			return false;
		} finally {
			setMenuSettingsSaving(false);
		}
	}, [menuSettings]);

	return {
		menuSettingsLoading,
		menuSettingsSaving,
		menuSettingsError,
		menuSettingsOk,
		menuSettings,
		planAllowsOnlineOrdering,
		setCartEnabled,
		setOrderChannel,
		saveMenuSettings,
		reloadMenuSettings,
		menuSettingsDirty,
	};
}
