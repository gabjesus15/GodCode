"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

import { LABS_QUOTE_BUDGETS, LABS_QUOTE_PROJECT_TYPES } from "@/lib/labs/content";
import { LABS_QUOTE_LIMITS } from "@/lib/labs/quote-request";
import { trackEvent } from "@/lib/analytics/track-event";
import { cn } from "@/utils/cn";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string; field?: string };

const FIELD =
	"mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] text-[#1d1d1f] placeholder:text-[#9a9aa0] focus:border-[#4f5bff] focus:outline-none focus:ring-2 focus:ring-[#4f5bff]/20";
const LABEL = "block text-sm font-medium text-[#1d1d1f]";

/**
 * Formulario de cotización. Envía a /api/labs/cotizar; el servidor avisa al
 * equipo por Telegram y correo. Sin librerías de formularios: seis campos.
 */
export function QuoteForm({ whatsappHref }: { whatsappHref: string | null }) {
	const [status, setStatus] = useState<Status>({ kind: "idle" });

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (status.kind === "sending") return;
		const form = event.currentTarget;
		const data = Object.fromEntries(new FormData(form).entries());
		setStatus({ kind: "sending" });
		try {
			const res = await fetch("/api/labs/cotizar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; field?: string } | null;
			if (!res.ok || !json?.ok) {
				setStatus({ kind: "error", message: json?.error || "No pudimos enviar la solicitud. Inténtalo de nuevo.", field: json?.field });
				return;
			}
			trackEvent("generate_lead", { method: "labs_quote_form", project_type: String(data.projectType ?? "") });
			form.reset();
			setStatus({ kind: "sent" });
		} catch {
			setStatus({ kind: "error", message: "Sin conexión. Revisa tu internet e inténtalo de nuevo." });
		}
	}

	if (status.kind === "sent") {
		return (
			<div className="rounded-2xl border border-black/[0.08] bg-white p-8">
				<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#4f5bff]/10 text-[#4f5bff]">
					<Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
				</span>
				<h3 className="mt-5 text-xl font-semibold tracking-tight text-[#1d1d1f]">Recibimos tu solicitud</h3>
				<p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">
					Te escribimos en menos de dos días hábiles al correo que indicaste. Si prefieres adelantar, también
					puedes contarnos por WhatsApp.
				</p>
				{whatsappHref ? (
					<a
						href={whatsappHref}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1d1d1f] underline decoration-black/20 underline-offset-4 hover:decoration-black/60"
					>
						Abrir WhatsApp
						<ArrowRight className="h-4 w-4" aria-hidden />
					</a>
				) : null}
			</div>
		);
	}

	const errorField = status.kind === "error" ? status.field : undefined;

	return (
		<form onSubmit={onSubmit} noValidate className="rounded-2xl border border-black/[0.08] bg-white p-6 sm:p-8">
			<div className="grid gap-5 sm:grid-cols-2">
				<div>
					<label htmlFor="labs-name" className={LABEL}>
						Nombre
					</label>
					<input
						id="labs-name"
						name="name"
						autoComplete="name"
						required
						maxLength={LABS_QUOTE_LIMITS.name}
						className={cn(FIELD, errorField === "name" && "border-red-400")}
					/>
				</div>
				<div>
					<label htmlFor="labs-company" className={LABEL}>
						Empresa
					</label>
					<input
						id="labs-company"
						name="company"
						autoComplete="organization"
						required
						maxLength={LABS_QUOTE_LIMITS.company}
						className={cn(FIELD, errorField === "company" && "border-red-400")}
					/>
				</div>
				<div>
					<label htmlFor="labs-email" className={LABEL}>
						Correo
					</label>
					<input
						id="labs-email"
						name="email"
						type="email"
						autoComplete="email"
						required
						maxLength={LABS_QUOTE_LIMITS.email}
						className={cn(FIELD, errorField === "email" && "border-red-400")}
					/>
				</div>
				<div>
					<label htmlFor="labs-phone" className={LABEL}>
						WhatsApp <span className="font-normal text-[#9a9aa0]">(opcional)</span>
					</label>
					<input
						id="labs-phone"
						name="phone"
						type="tel"
						autoComplete="tel"
						placeholder="+56 9 1234 5678"
						maxLength={LABS_QUOTE_LIMITS.phone}
						className={cn(FIELD, errorField === "phone" && "border-red-400")}
					/>
				</div>
				<div>
					<label htmlFor="labs-type" className={LABEL}>
						Tipo de proyecto
					</label>
					<select
						id="labs-type"
						name="projectType"
						required
						defaultValue=""
						className={cn(FIELD, errorField === "projectType" && "border-red-400")}
					>
						<option value="" disabled>
							Elige una opción
						</option>
						{LABS_QUOTE_PROJECT_TYPES.map((type) => (
							<option key={type.value} value={type.value}>
								{type.label}
							</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor="labs-budget" className={LABEL}>
						Presupuesto estimado
					</label>
					<select id="labs-budget" name="budget" defaultValue="" className={FIELD}>
						{LABS_QUOTE_BUDGETS.map((budget) => (
							<option key={budget.value || "none"} value={budget.value}>
								{budget.label}
							</option>
						))}
					</select>
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="labs-message" className={LABEL}>
						Qué necesitas
					</label>
					<textarea
						id="labs-message"
						name="message"
						required
						rows={5}
						minLength={LABS_QUOTE_LIMITS.messageMin}
						maxLength={LABS_QUOTE_LIMITS.message}
						placeholder="Qué hace tu empresa, qué problema quieres resolver y para cuándo lo necesitas."
						className={cn(FIELD, "resize-y", errorField === "message" && "border-red-400")}
					/>
				</div>
				{/* Campo trampa para bots: oculto a personas y a lectores de pantalla. */}
				<div className="hidden" aria-hidden>
					<label htmlFor="labs-website">Sitio web</label>
					<input id="labs-website" name="website" tabIndex={-1} autoComplete="off" />
				</div>
			</div>

			{status.kind === "error" ? (
				<p role="alert" className="mt-4 text-sm text-red-600">
					{status.message}
				</p>
			) : null}

			<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<button
					type="submit"
					disabled={status.kind === "sending"}
					className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#4f5bff] disabled:cursor-wait disabled:opacity-70"
				>
					{status.kind === "sending" ? "Enviando…" : "Enviar solicitud"}
					<ArrowRight className="h-4 w-4" aria-hidden />
				</button>
				<p className="text-xs leading-relaxed text-[#9a9aa0]">
					Usamos estos datos solo para responderte. Sin listas de correo.
				</p>
			</div>
		</form>
	);
}
