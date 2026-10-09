"use client";

import Link from "next/link";
import { ArrowRight, Clock, Eye } from "lucide-react";

import { trackEvent } from "@/lib/analytics/track-event";

/**
 * «Arma y paga»: arriba de la cuenta mientras la tienda sigue en vista previa. Lleva a
 * seguir armándola o a publicarla (elegir plan y pagar); con el pago en revisión, al estado.
 */
export function StoreDraftAccountBanner({ paymentInReview, storeUrl }: { paymentInReview: boolean; storeUrl: string | null }) {
	return (
		<section
			aria-label="Tu tienda en vista previa"
			className="mb-6 overflow-hidden rounded-2xl bg-[#0B0D12] text-white shadow-[0_18px_40px_-24px_rgba(11,13,18,0.7)]"
		>
			<div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div className="flex min-w-0 items-start gap-3.5">
					<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
						{paymentInReview ? <Clock className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
					</span>
					<span className="min-w-0">
						<span className="block text-[15px] font-semibold tracking-[-0.01em]">
							{paymentInReview ? "Validando tu pago" : "Tu tienda está en vista previa"}
						</span>
						<span className="mt-1 block text-sm leading-relaxed text-white/70">
							{paymentInReview
								? "Se publica sola apenas confirmemos el pago. Mientras tanto puedes seguir ajustándola."
								: "Tus clientes todavía no la ven. Cuando esté lista, publícala: eliges tu plan y pagas."}
						</span>
					</span>
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
					{storeUrl ? (
						<a
							href={storeUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-white/85 ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
						>
							Ver vista previa
						</a>
					) : null}
					<Link
						href="/cuenta/configurar"
						className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-white/85 ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
					>
						Seguir armando
					</Link>
					<Link
						href="/cuenta/publicar"
						prefetch={false}
						onClick={() => trackEvent("publish_click", { flow: "draft", from: "account" })}
						className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-[#0B0D12] transition-transform hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.98]"
					>
						{paymentInReview ? "Ver el estado" : "Publicar mi tienda"}
						<ArrowRight className="h-4 w-4" aria-hidden />
					</Link>
				</div>
			</div>
		</section>
	);
}
