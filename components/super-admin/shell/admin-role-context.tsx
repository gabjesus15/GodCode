"use client";

import { createContext, useContext } from "react";

export type SaasAdminRole = "super_admin" | "support" | string;

type Ctx = {
	role: SaasAdminRole;
	readOnly: boolean;
};

const AdminRoleContext = createContext<Ctx>({ role: "super_admin", readOnly: false });

export function AdminRoleProvider({
	role,
	children,
}: {
	role: SaasAdminRole;
	children: React.ReactNode;
}) {
	const r = String(role || "super_admin").toLowerCase();
	const readOnly = r === "support";
	return (
		<AdminRoleContext.Provider value={{ role: r as SaasAdminRole, readOnly }}>
			{children}
		</AdminRoleContext.Provider>
	);
}

export function useAdminRole() {
	return useContext(AdminRoleContext);
}
