"use client";

import { useCallback } from "react";

import { TotpMfaEnrollPanel } from "@/components/mfa/totp-mfa-enroll-panel";
import { requireAdminRole, roleSets } from "@/utils/admin";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

export function SuperAdminMfaEnroll() {
	const { readOnly } = useAdminRole();
	const assertCanMutate = useCallback(async () => requireAdminRole(roleSets.billing), []);

	return (
		<TotpMfaEnrollPanel
			authScope="super-admin"
			friendlyNameDefault="Panel GodCode"
			assertCanMutate={assertCanMutate}
			readOnly={readOnly}
			readOnlyMessage="Modo soporte: solo un super admin puede registrar el autenticador en su propia sesión."
			title="Google Authenticator (TOTP)"
			description={
				<p>
					Cada administrador configura MFA en <strong>su propia cuenta</strong> (la misma con la que inicia sesión aquí). Así podrás
					confirmar acciones sensibles con un código de 6 dígitos.
				</p>
			}
			showSupabaseEnrollHint
		/>
	);
}
