"use client";

import type { UseEmailSenderReturn } from "../../hooks/use-email-sender";
import { CouponEmailSenderCard } from "../coupon-email-sender-card";

export type AccountCorreoTabProps = {
	emailSender: UseEmailSenderReturn;
	timezone?: string | null;
	onAskSupport: (customDomain: string) => void;
};

/** Correo de los cupones: el Resend propio del negocio, si tiene dominio propio. */
export function AccountCorreoTab({ emailSender, timezone, onAskSupport }: AccountCorreoTabProps) {
	return (
		<div className="space-y-4">
			<CouponEmailSenderCard emailSender={emailSender} timezone={timezone} onAskSupport={onAskSupport} />
		</div>
	);
}
