import { SuperAdminMfaEnroll } from "@/components/super-admin/mfa/super-admin-mfa-enroll";

export default function HerramientasAutenticadorPage() {
	return (
		<div className="min-w-0 space-y-4 sm:space-y-6">
			<div>
				<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">Autenticador MFA</h2>
				<p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
					Configura Google Authenticator para tu usuario de administración (sesión actual).
				</p>
			</div>
			<SuperAdminMfaEnroll />
		</div>
	);
}
