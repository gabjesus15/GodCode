import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";

import "./super-admin.css";

import { AdminRoleProvider } from "../../components/super-admin/shell/admin-role-context";
import { SaasAdminPwaRegister } from "../../components/super-admin/shell/saas-admin-pwa-register";
import { AdminShell } from "../../components/super-admin/shell/admin-shell";
import { SaasThemeEnforcer } from "../../components/theme/saas-theme-enforcer";
import { getSuperAdminRoleByEmail } from "@/lib/super-admin/account-access";
import { createSupabaseServerClient } from "../../utils/supabase/server";
import { QueryProvider } from "@/components/ui/query-provider";

export const metadata: Metadata = {
	manifest: "/saas-admin/manifest.webmanifest",
	icons: {
		icon: [
			{ url: "/favicon.png", type: "image/png", sizes: "1024x1024" },
			{ url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
		],
		apple: "/apple-touch-icon.png",
	},
	appleWebApp: {
		capable: true,
		title: "Gcode Admin",
		statusBarStyle: "default",
	},
	robots: {
		index: false,
		follow: false,
		nocache: true,
		googleBot: { index: false, follow: false },
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	themeColor: "#111827",
};

export default async function SuperAdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user?.email) {
		redirect("/login");
	}

	// Service role (igual que /post-login): un super_admin sin fila en public.users
	// no debe depender de RLS de admin_users para entrar al panel.
	const role = (await getSuperAdminRoleByEmail(user.email)) ?? "";
	const allowedRoles = new Set(["super_admin", "support"]);

	if (!allowedRoles.has(role)) {
		redirect("/login");
	}

	return (
		<QueryProvider>
			<SaasThemeEnforcer />
			<SaasAdminPwaRegister />
			<AdminRoleProvider role={role}>
				<AdminShell>{children}</AdminShell>
			</AdminRoleProvider>
		</QueryProvider>
	);
}
