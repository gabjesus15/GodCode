"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { VerifyEmailStatus } from "@/components/onboarding/steps/VerifyEmailStatus";

/** Variante antigua del enlace (/onboarding/verify?token=…), que siguen teniendo correos ya enviados. */
function VerifyFromQuery() {
	const token = useSearchParams()?.get("token") ?? null;
	return <VerifyEmailStatus token={token} />;
}

export default function OnboardingVerifyPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-[50vh] items-center justify-center">
					<span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" aria-hidden />
				</div>
			}
		>
			<VerifyFromQuery />
		</Suspense>
	);
}
