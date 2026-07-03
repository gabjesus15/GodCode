import { createSupabaseBrowserClient } from "@/utils/supabase/client";

function clearScopedBrowserClients(): void {
	if (typeof window === "undefined") return;
	const w = window as Window & {
		__saasGodcodeSupabaseClients?: Record<string, unknown>;
	};
	delete w.__saasGodcodeSupabaseClients;
}

/** Cierra sesión en servidor y navega al login (recarga completa para limpiar estado cliente). */
export async function signOutAndRedirect(redirectTo = "/login"): Promise<void> {
	try {
		await fetch("/api/auth/signout", {
			method: "POST",
			credentials: "include",
			redirect: "manual",
		});
	} catch {
		await Promise.allSettled([
			createSupabaseBrowserClient("super-admin").auth.signOut(),
			createSupabaseBrowserClient("tenant").auth.signOut(),
		]);
	}

	clearScopedBrowserClients();
	window.location.assign(redirectTo);
}
