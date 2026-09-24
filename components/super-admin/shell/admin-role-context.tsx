"use client";

import { createContext, useContext } from "react";

export type SaasAdminRole = "super_admin" | "support" | string;

type Ctx = {
	role: SaasAdminRole;
	readOnly: boolean;
	/** Email de quien tiene la sesión abierta (se muestra al pie de la barra lateral). */
	email: string;
};

const AdminRoleContext = createContext<Ctx>({ role: "super_admin", readOnly: false, email: "" });

export function AdminRoleProvider({
	role,
	email = "",
	children,
}: {
	role: SaasAdminRole;
	email?: string;
	children: React.ReactNode;
}) {
	const r = String(role || "super_admin").toLowerCase();
	const readOnly = r === "support";
	return (
		<AdminRoleContext.Provider value={{ role: r as SaasAdminRole, readOnly, email }}>
			{children}
		</AdminRoleContext.Provider>
	);
}

export function useAdminRole() {
	return useContext(AdminRoleContext);
}
