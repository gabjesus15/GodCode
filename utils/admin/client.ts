export type AdminRole = "super_admin" | "ceo" | "cashier" | "staff" | string;

export const roleSets = {
	billing: ["super_admin"],
	destructive: ["super_admin"],
};

export async function requireAdminRole(allowedRoles: string[]) {
	try {
		const response = await fetch("/api/super-admin/permissions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
			body: JSON.stringify({ allowedRoles }),
		});

		const data = (await response.json()) as
			| { ok: true; email: string; role: string }
			| { ok: false; error?: string };

		if (!response.ok || !data.ok) {
			return {
				ok: false,
				error: data.ok ? "No autorizado" : data.error ?? "No autorizado",
			} as const;
		}

		return { ok: true, email: data.email, role: data.role } as const;
	} catch {
		return { ok: false, error: "No se pudo validar el usuario." } as const;
	}
}
