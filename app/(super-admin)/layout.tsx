import type { Metadata, Viewport } from "next";

import "./super-admin.css";

import { AdminRoleProvider } from "../../components/super-admin/shell/admin-role-context";
import { SaasAdminPwaRegister } from "../../components/super-admin/shell/saas-admin-pwa-register";
import { AdminShell } from "../../components/super-admin/shell/admin-shell";
import { SaasThemeEnforcer } from "../../components/theme/saas-theme-enforcer";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";
import { QueryProvider } from "@/components/ui/query-provider";

export const metadata: Metadata = {
	title: { default: "Gcode Admin", template: "%s · Gcode Admin" },
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

// Sin bloquear el zoom: quien necesita agrandar el texto (WCAG 1.4.4) tiene que poder hacerlo.
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#111827",
};

export default async function SuperAdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { role, email } = await requireSuperAdminSession();

	return (
		<QueryProvider>
			<SaasThemeEnforcer />
			<SaasAdminPwaRegister />
			<AdminRoleProvider role={role} email={email}>
				<AdminShell>{children}</AdminShell>
			</AdminRoleProvider>
		</QueryProvider>
	);
}
