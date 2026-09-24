"use client";

import { useParams } from "next/navigation";

import { VerifyEmailStatus } from "@/components/onboarding/steps/VerifyEmailStatus";

/** Enlace del correo de confirmación: /onboarding/verify/<token>. */
export default function OnboardingVerifyTokenPage() {
	const params = useParams();
	const token = typeof params?.token === "string" ? params.token : null;
	return <VerifyEmailStatus token={token} />;
}
