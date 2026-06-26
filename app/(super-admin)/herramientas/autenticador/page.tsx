import { ShieldCheck } from "lucide-react";
import { SuperAdminMfaEnroll } from "@/components/super-admin/mfa/super-admin-mfa-enroll";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";

export default function HerramientasAutenticadorPage() {
	return (
		<div className="min-w-0 space-y-5 sm:space-y-6">
			<SaasPageHeader
				title="Seguridad MFA"
				description="Configura Google Authenticator para tu usuario de administración (sesión actual)."
				icon={ShieldCheck}
			/>
			<SuperAdminMfaEnroll />
		</div>
	);
}
