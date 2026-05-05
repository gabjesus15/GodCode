"use client";

import { ChevronRight, ExternalLink, ShieldCheck, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { TotpMfaEnrollPanel } from "@/components/mfa/totp-mfa-enroll-panel";

const GOOGLE_AUTHENTICATOR_IOS =
	"https://apps.apple.com/app/google-authenticator/id388497605";
const GOOGLE_AUTHENTICATOR_ANDROID =
	"https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2";
const AUTHY_INSTALL = "https://authy.com/download/";

function StoreQrCard({
	title,
	subtitle,
	href,
	storeUrl,
}: {
	title: string;
	subtitle: string;
	href: string;
	storeUrl: string;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex flex-col items-center rounded-2xl border border-[#e5e5ea] bg-[#fbfbfd] p-3 transition hover:border-indigo-200 hover:bg-white hover:shadow-md sm:p-4"
		>
			<div className="rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-[#e5e5ea] transition group-hover:ring-indigo-100 sm:rounded-xl sm:p-2">
				<QRCodeSVG value={storeUrl} size={96} level="M" marginSize={1} title={`QR: ${title}`} />
			</div>
			<p className="mt-2 text-center text-[11px] font-semibold text-[#1d1d1f] sm:mt-3 sm:text-xs">{title}</p>
			<p className="mt-0.5 text-center text-[10px] text-[#6e6e73] sm:text-[11px]">{subtitle}</p>
			<span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 sm:mt-2 sm:text-xs">
				Abrir tienda
				<ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
			</span>
		</a>
	);
}

export function AccountSeguridadTab() {
	return (
		<div className="space-y-5 sm:space-y-6">
			{/* Hero: en móvil el icono va junto al título (no debajo), para no “pesar” visualmente */}
			<section className="relative overflow-hidden rounded-2xl border border-[#e5e5ea] bg-gradient-to-br from-indigo-50/90 via-white to-[#fbfbfd] p-4 shadow-sm sm:p-8">
				<div
					className="pointer-events-none absolute -right-24 -top-20 h-36 w-36 rounded-full bg-indigo-400/[0.08] blur-2xl sm:-right-16 sm:-top-16 sm:h-48 sm:w-48 sm:bg-indigo-400/10 sm:blur-3xl"
					aria-hidden
				/>
				<div className="relative">
					<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600 sm:tracking-[0.2em]">
						Seguridad de la cuenta
					</p>
					<div className="mt-2 flex items-start gap-3 sm:mt-3 sm:gap-5 md:items-start">
						<div className="min-w-0 flex-1">
							<h2 className="text-[1.2rem] font-semibold leading-snug tracking-tight text-[#1d1d1f] sm:text-[1.65rem] sm:leading-tight">
								Activa el doble factor en un minuto
							</h2>
							<p className="mt-2.5 text-[13px] leading-relaxed text-[#6e6e73] sm:mt-3 sm:text-sm">
								Así solo tú podrás entrar aunque alguien obtenga tu contraseña. Descarga la app en tu móvil, escanea el código que te daremos abajo y
								listo: en cada inicio de sesión tu teléfono generará un código de 6 dígitos que caduca solo.
							</p>
						</div>
						<div
							className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 sm:h-14 sm:w-14 sm:rounded-2xl sm:shadow-lg md:h-[4.5rem] md:w-[4.5rem] md:shadow-indigo-600/30"
							aria-hidden
						>
							<ShieldCheck className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9" strokeWidth={1.65} />
						</div>
					</div>
				</div>
			</section>

			{/* Descarga + pasos */}
			<div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-6">
				<section className="rounded-2xl border border-[#e5e5ea] bg-white p-4 shadow-sm sm:p-6">
					<div className="flex items-start gap-2.5 sm:gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7] text-indigo-600 sm:h-10 sm:w-10 sm:rounded-xl">
							<Smartphone className="h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
						</div>
						<div className="min-w-0">
							<h3 className="text-[15px] font-semibold leading-snug text-[#1d1d1f] sm:text-base">¿Todavía no tienes la app?</h3>
							<p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73] sm:text-sm">
								Te recomendamos <strong className="font-medium text-[#424245]">Google Authenticator</strong> (gratis). También sirven Authy o la app
								de contraseñas que ya uses, si admite códigos TOTP.
							</p>
						</div>
					</div>

					<div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:gap-3">
						<a
							href={GOOGLE_AUTHENTICATOR_IOS}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black sm:py-3"
						>
							<span className="text-[11px] font-bold uppercase tracking-wider text-white/80">iOS</span>
							App Store
							<ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
						</a>
						<a
							href={GOOGLE_AUTHENTICATOR_ANDROID}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] px-4 py-2.5 text-sm font-semibold text-[#1d1d1f] transition hover:border-emerald-300/80 hover:bg-emerald-50/60 sm:py-3"
						>
							<span className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73]">Android</span>
							Google Play
							<ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
						</a>
					</div>

					<p className="mt-4 text-center text-xs font-medium uppercase tracking-[0.12em] text-[#a1a1a6]">
						O escanea con la cámara del móvil
					</p>
					<div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4">
						<StoreQrCard
							title="iPhone / iPad"
							subtitle="Google Authenticator"
							href={GOOGLE_AUTHENTICATOR_IOS}
							storeUrl={GOOGLE_AUTHENTICATOR_IOS}
						/>
						<StoreQrCard
							title="Android"
							subtitle="Google Authenticator"
							href={GOOGLE_AUTHENTICATOR_ANDROID}
							storeUrl={GOOGLE_AUTHENTICATOR_ANDROID}
						/>
					</div>

					<p className="mt-4 text-center text-xs text-[#6e6e73]">
						Prefieres Authy?{" "}
						<a href={AUTHY_INSTALL} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 underline-offset-2 hover:underline">
							Descargar Authy
						</a>
					</p>
				</section>

				<section className="flex flex-col justify-center rounded-2xl border border-[#e5e5ea] bg-white p-4 shadow-sm sm:p-6">
					<h3 className="text-[15px] font-semibold leading-snug text-[#1d1d1f] sm:text-base">Cómo quedará todo enlazado</h3>
					<ol className="mt-3 space-y-3.5 sm:mt-4 sm:space-y-4">
						{[
							{
								step: "1",
								title: "Instala la app en tu móvil",
								body: "Con los botones o los códigos QR de al lado abres directo la tienda oficial.",
							},
							{
								step: "2",
								title: "Pulsa «Conectar Google Authenticator» más abajo",
								body: "Te mostraremos un código QR propio de tu cuenta GodCode. Escánalo desde la app con «añadir cuenta» o «escanear código».",
							},
							{
								step: "3",
								title: "Confirma con el código de 6 dígitos",
								body: "La app mostrará números que cambian cada pocos segundos; cópialos aquí para activar el doble factor en esta cuenta.",
							},
						].map((item) => (
							<li key={item.step} className="flex gap-2.5 sm:gap-3">
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 sm:h-8 sm:w-8 sm:text-sm">
									{item.step}
								</span>
								<div className="min-w-0">
									<p className="text-[13px] font-medium leading-snug text-[#1d1d1f] sm:text-sm">{item.title}</p>
									<p className="mt-1 text-[12px] leading-relaxed text-[#6e6e73] sm:text-sm">{item.body}</p>
								</div>
							</li>
						))}
					</ol>
				</section>
			</div>

			<details className="group rounded-2xl border border-[#e5e5ea] bg-[#fbfbfd] px-4 py-3 text-sm shadow-sm open:bg-white open:shadow-md sm:px-5">
				<summary className="cursor-pointer list-none font-medium text-[#1d1d1f] outline-none [&::-webkit-details-marker]:hidden">
					<span className="flex items-center justify-between gap-2">
						¿Te sale un error al registrar el código?
						<ChevronRight className="h-4 w-4 shrink-0 text-[#a1a1a6] transition group-open:rotate-90" aria-hidden />
					</span>
				</summary>
				<div className="mt-3 border-t border-[#e5e5ea] pt-3 text-[#6e6e73]">
					<p className="leading-relaxed">
						Si el mensaje dice algo como «MFA enroll is disabled», quien administra la plataforma debe habilitar el{" "}
						<strong className="font-medium text-[#424245]">registro TOTP</strong> en el proyecto de Supabase (no basta con solo «verify»). Si no ves ese
						error y el código falla, espera a que cambie el siguiente código en la app y vuelve a intentar.
					</p>
				</div>
			</details>

			<section className="rounded-2xl border border-[#e5e5ea] bg-white p-4 shadow-sm sm:p-6">
				<div className="mb-5 border-b border-[#f5f5f7] pb-5 sm:mb-6 sm:pb-6">
					<h3 className="text-base font-semibold text-[#1d1d1f] sm:text-lg">Enlazar esta cuenta</h3>
					<p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#6e6e73] sm:text-sm">
						Cuando pulses el botón, generamos un código QR único para ti. Nadie más puede usarlo para entrar: solo sirve para dar de alta tu app en esta
						sesión.
					</p>
				</div>

				<TotpMfaEnrollPanel
					authScope="super-admin"
					friendlyNameDefault="Portal de cuenta GodCode"
					appearance="portal"
					omitHeader
					showSupabaseEnrollHint={false}
					enrollButtonLabel="Conectar Google Authenticator"
				/>
			</section>
		</div>
	);
}
