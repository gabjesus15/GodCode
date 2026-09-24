import type { ReactNode } from "react";

import { LandingBrandMark } from "@/components/landing-v3/landing-brand-mark";

/** Fondo, tarjeta y marca de las pantallas de acceso (mismo aspecto que /login). */
export function AuthCard({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#F5F7FF] via-[#FAFBFF] to-white px-4 py-8 sm:px-6">
			<div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#4F5BFF]/[0.06] blur-3xl" />
			<div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#4F5BFF]/[0.05] blur-3xl" />
			<main className="relative w-full max-w-[420px] rounded-[32px] bg-white p-6 shadow-[0_24px_80px_-24px_rgba(79,91,255,0.16)] sm:p-10">
				<div className="mb-8 flex justify-center">
					<LandingBrandMark variant="onLight" className="h-14 sm:h-16" priority />
				</div>
				{children}
			</main>
		</div>
	);
}

export const authInputClass =
	"h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#4F5BFF] focus:ring-4 focus:ring-[#4F5BFF]/10 sm:text-sm";

export const authPrimaryButtonClass =
	"mt-1 w-full rounded-xl bg-[#4F5BFF] text-white hover:bg-[#3f49cc] focus-visible:ring-[#4F5BFF]";
