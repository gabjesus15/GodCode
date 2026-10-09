"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

import { readOnboardingToken } from "@/lib/onboarding/onboarding-token-storage";

/** `sessionStorage` no avisa cambios en la misma pestaña: basta con leerlo al hidratar. */
const subscribeNothing = () => () => undefined;
const noTokenOnServer = () => null;

/**
 * «Intentar de nuevo» en la vuelta de un pago que no se completó. El token del alta no viaja
 * en la página (sería dárselo a cualquiera con la referencia del pago): se toma de esta
 * pestaña, donde lo dejó la página de pago. Sin él se vuelve al registro, que manda al
 * correo el enlace para retomar.
 */
export function CheckoutRetryLink({ className, children }: { className?: string; children: React.ReactNode }) {
	const token = useSyncExternalStore(subscribeNothing, readOnboardingToken, noTokenOnServer);
	const href = token ? `/onboarding/pago?token=${encodeURIComponent(token)}` : "/onboarding";

	return (
		<Link href={href} className={className}>
			{children}
		</Link>
	);
}
