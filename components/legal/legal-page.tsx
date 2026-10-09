/**
 * Piezas compartidas de las páginas legales (términos, privacidad, cookies).
 *
 * Los textos viven en las páginas; aquí solo va el marco visual y los datos del
 * proveedor, para que las tres páginas digan lo mismo sobre quién es Gcode.
 *
 * Este archivo lo importan también componentes de cliente (`ProviderIdentity` en los
 * términos de la cuenta del menú): nada de `next/headers` ni de código solo de servidor.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { LEGAL_PROVIDER_ADDRESS, LEGAL_PROVIDER_RUT, LEGAL_UPDATED_AT_LABEL } from "@/lib/legal/legal-documents";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";

export function SupportEmail() {
	return (
		<a href={`mailto:${LANDING_SUPPORT_EMAIL}`} className="font-medium text-indigo-600 hover:underline">
			{LANDING_SUPPORT_EMAIL}
		</a>
	);
}

/**
 * RUT y domicilio del titular (Reglamento de Comercio Electrónico, DS 6/2021).
 * Mientras no estén configurados no se muestra nada: mejor omitirlos que publicar
 * un marcador vacío.
 */
export function ProviderIdentity() {
	const parts = [
		LEGAL_PROVIDER_RUT ? `RUT ${LEGAL_PROVIDER_RUT}` : null,
		LEGAL_PROVIDER_ADDRESS ? `domicilio en ${LEGAL_PROVIDER_ADDRESS}` : null,
	].filter(Boolean);
	if (parts.length === 0) return null;
	return <>, {parts.join(", ")}</>;
}

export function Lead({ children }: { children: ReactNode }) {
	return <strong className="font-semibold text-slate-700">{children}</strong>;
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link href={href} className="font-medium text-indigo-600 hover:underline">
			{children}
		</Link>
	);
}

export function LegalTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
	return (
		<div className="mt-2 overflow-x-auto">
			<table className="w-full min-w-[32rem] border-collapse text-left text-xs sm:text-sm">
				<thead>
					<tr>
						{head.map((cell) => (
							<th key={cell} scope="col" className="border-b border-slate-200 py-2 pr-3 font-semibold text-slate-700">
								{cell}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						<tr key={i} className="align-top">
							{row.map((cell, j) => (
								<td key={j} className="border-b border-slate-100 py-2 pr-3">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * Marco de las páginas legales. `backHref` es el destino de «Volver»: cada página lo
 * calcula con `getLegalBackHref()` (`lib/legal/legal-back-href-server`), que lleva a la
 * pantalla del alta o a la página del sitio de la que venía la persona, o a la home.
 */
export function LegalPage({ title, backHref = "/", children }: { title: string; backHref?: string; children: ReactNode }) {
	return (
		<div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
			<div className="onboarding-card p-6 sm:p-8">
				<h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
				<p className="mt-2 text-xs text-slate-500">Última actualización: {LEGAL_UPDATED_AT_LABEL}</p>

				<div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">{children}</div>

				<Link href={backHref} className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline">
					Volver
				</Link>
			</div>
		</div>
	);
}
