import type { Metadata, Viewport } from "next";

import "../super-admin.tailwind.css";
import { SaasAdminPwaRegister } from "../../components/super-admin/shell/saas-admin-pwa-register";

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

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<SaasAdminPwaRegister />
			{children}
		</>
	);
}
