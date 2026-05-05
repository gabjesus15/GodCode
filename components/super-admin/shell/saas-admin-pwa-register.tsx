"use client";

import { useEffect } from "react";

const SW_PATH = "/saas-admin/sw.js";
const SW_SCOPE = "/";

/**
 * Registra el service worker del panel super-admin (manifest vía metadata del layout).
 */
export function SaasAdminPwaRegister() {
	useEffect(() => {
		if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
			return;
		}

		const cleanupAdminSw = async () => {
			try {
				const regs = await navigator.serviceWorker.getRegistrations();
				await Promise.all(
					regs
						.filter((reg) => reg.active?.scriptURL?.includes(SW_PATH))
						.map((reg) => reg.unregister()),
				);
			} catch {
				// Ignorar: no bloquear la app por limpieza de SW.
			}

			if (typeof caches === "undefined") return;

			try {
				const keys = await caches.keys();
				await Promise.all(
					keys
						.filter((key) => key.startsWith("saas-admin-"))
						.map((key) => caches.delete(key)),
				);
			} catch {
				// Ignorar: algunos navegadores pueden restringir Cache API.
			}
		};

		if (process.env.NODE_ENV !== "production") {
			void cleanupAdminSw();
			return;
		}

		const register = async () => {
			try {
				await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
			} catch {
				// No bloquear la UI si el SW falla (HTTPS, permisos, etc.).
			}
		};

		void register();
	}, []);

	return null;
}
