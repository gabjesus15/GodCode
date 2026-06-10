import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";

import { AdminRoleProvider } from "../../components/super-admin/shell/admin-role-context";
import { SaasAdminPwaRegister } from "../../components/super-admin/shell/saas-admin-pwa-register";
import { AdminShell } from "../../components/super-admin/shell/admin-shell";
import { ThemeToggle } from "../../components/theme/theme-toggle";
import { createSupabaseServerClient } from "../../utils/supabase/server";
import { QueryProvider } from "@/components/ui/query-provider";

export const metadata: Metadata = {
	manifest: "/saas-admin/manifest.webmanifest",
	icons: {
		icon: "/logo.png",
		apple: "/logo.png",
	},
	appleWebApp: {
		capable: true,
		title: "GodCode Admin",
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

	// Comentario: validamos que el email exista en admin_users antes de mostrar el panel.
	const { data: adminUser, error: adminError } = await supabase
		.from("admin_users")
		.select("id,role")
		.ilike("email", user.email)
		.maybeSingle();

	const role = String(adminUser?.role ?? "").toLowerCase();
	const allowedRoles = new Set(["super_admin", "support"]);

	if (adminError || !adminUser || !allowedRoles.has(role)) {
		redirect("/login");
	}

	return (
		<QueryProvider>
			<SaasAdminPwaRegister />
			<ThemeToggle />
			<AdminRoleProvider role={role}>
				<AdminShell>{children}</AdminShell>
			</AdminRoleProvider>
		</QueryProvider>
	);
}
