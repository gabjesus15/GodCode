"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ShieldCheck, Settings } from "lucide-react";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { Card } from "@/components/ui/card";

const RolesManager = dynamic(() => import("@/components/super-admin/roles/roles-manager").then((mod) => mod.default), { ssr: false });
const AdminModulesManager = dynamic(() => import("@/components/super-admin/roles/admin-modules-manager").then((mod) => mod.default), { ssr: false });
const BroadcastsManager = dynamic(() => import("@/components/super-admin/broadcasts/broadcasts-manager").then((mod) => mod.default), { ssr: false });

export function HerramientasClient() {
	const { readOnly } = useAdminRole();

	return (
		<div className="min-w-0 space-y-5 sm:space-y-6">
			<SaasPageHeader
				title="Configuración global"
				description="Gestiona roles, módulos, difusiones y seguridad del panel de administración."
				icon={Settings}
			/>

			{readOnly ? (
				<p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
					Modo soporte: solo lectura en esta página.
				</p>
			) : null}

			<Link href="/herramientas/autenticador" className="block">
				<Card className="group relative overflow-hidden rounded-3xl border-zinc-200/60 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-zinc-900/80 dark:hover:border-zinc-700">
					<div className="flex items-center gap-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
							<ShieldCheck className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
						</div>
						<div className="flex-1">
							<p className="font-medium text-zinc-900 dark:text-zinc-100">Seguridad MFA</p>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Configura Google Authenticator para tu usuario de administración.
							</p>
						</div>
						<span className="text-sm font-medium text-zinc-500 transition group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">
							Configurar →
						</span>
					</div>
				</Card>
			</Link>

			<RolesManager />
			<AdminModulesManager />
			<BroadcastsManager />
		</div>
	);
}
