"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";

export type MenuPerfProfile = {
	isLowEnd: boolean;
	maxCloudinaryWidth: number;
	priorityImageMax: number;
	heroAutoplay: boolean;
	menuRealtimeDeferMs: number;
};

export const DEFAULT_MENU_PERF_PROFILE: MenuPerfProfile = {
	isLowEnd: false,
	maxCloudinaryWidth: 600,
	priorityImageMax: TENANT_UI_CONFIG.priorityImageMax,
	heroAutoplay: true,
	menuRealtimeDeferMs: TENANT_UI_CONFIG.menuRealtimeDeferMs,
};

export const LOW_END_MENU_PERF_PROFILE: MenuPerfProfile = {
	isLowEnd: true,
	maxCloudinaryWidth: 360,
	priorityImageMax: 3,
	heroAutoplay: false,
	menuRealtimeDeferMs: 8000,
};

const MenuPerfContext = createContext<MenuPerfProfile>(DEFAULT_MENU_PERF_PROFILE);

export function MenuPerfProvider({
	isLowEnd,
	children,
}: {
	isLowEnd: boolean;
	children: ReactNode;
}) {
	const value = useMemo(
		() => (isLowEnd ? LOW_END_MENU_PERF_PROFILE : DEFAULT_MENU_PERF_PROFILE),
		[isLowEnd],
	);

	return <MenuPerfContext.Provider value={value}>{children}</MenuPerfContext.Provider>;
}

export function useMenuPerfProfile(): MenuPerfProfile {
	return useContext(MenuPerfContext);
}
