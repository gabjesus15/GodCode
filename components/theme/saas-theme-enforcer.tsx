"use client";

import { useEffect } from "react";

import { forceLightTheme } from "./saas-theme-scope";

export function SaasThemeEnforcer() {
	useEffect(() => {
		forceLightTheme();
	}, []);

	return null;
}
