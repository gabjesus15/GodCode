import { createSupabaseBrowserClient } from "@/utils/supabase/client";

function clearScopedBrowserClients(): void {
	if (typeof window === "undefined") return;
	const w = window as Window & {
		__saasGodcodeSupabaseClients?: Record<string, unknown>;
	};
	delete w.__saasGodcodeSupabaseClients;
}

/**
 * El service worker del panel guarda páginas para el modo sin conexión. Al cerrar sesión
 * se borran: en un equipo compartido, la siguiente persona veía offline los datos del panel.
 */
async function clearAdminPageCaches(): Promise<void> {
	if (typeof window === "undefined" || !("caches" in window)) return;
	try {
		const keys = await caches.keys();
		await Promise.all(keys.filter((key) => key.startsWith("saas-admin-pages")).map((key) => caches.delete(key)));
	} catch {
		// Sin acceso a Cache Storage (modo privado, permisos): no bloquea el cierre de sesión.
	}
}

/** Cierra sesión en servidor y navega al login (recarga completa para limpiar estado cliente). */
export async function signOutAndRedirect(redirectTo = "/login"): Promise<void> {
	await clearAdminPageCaches();
	try {
		await fetch("/api/auth/signout", {
			method: "POST",
			credentials: "include",
			redirect: "manual",
		});
	} catch {
		await Promise.allSettled([
			createSupabaseBrowserClient("super-admin").auth.signOut({ scope: "local" }),
			createSupabaseBrowserClient("tenant").auth.signOut({ scope: "local" }),
		]);
	}

	clearScopedBrowserClients();
	window.location.assign(redirectTo);
}
