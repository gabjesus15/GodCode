"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

import { trackEvent } from "@/lib/analytics/track-event";
import { LABS_QUOTE_BUDGETS, LABS_QUOTE_PROJECT_TYPES } from "@/lib/labs/content";
import { LABS_QUOTE_LIMITS, parseQuoteRequest, type LabsQuoteRequest } from "@/lib/labs/quote-request";
import { RECAPTCHA_ACTIONS } from "@/lib/onboarding/recaptcha";
import { cn } from "@/utils/cn";

import { RECAPTCHA_SITE_KEY, getRecaptchaToken, preloadRecaptcha } from "./lazy-recaptcha";

type QuoteField = keyof LabsQuoteRequest;

type Status =
	| { kind: "idle" }
	| { kind: "sending" }
	| { kind: "sent" }
	| { kind: "error"; message: string; field?: QuoteField };

const FIELD =
	"mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] text-[#1d1d1f] placeholder:text-[#9a9aa0] focus:border-[#4f5bff] focus:outline-none focus:ring-2 focus:ring-[#4f5bff]/30";
const FIELD_INVALID = "border-red-400";
const LABEL = "block text-sm font-medium text-[#1d1d1f]";
/** Error de un campo, bajo el campo; el campo lo enlaza con `aria-describedby`. */
const fieldErrorId = (field: QuoteField) => `labs-quote-error-${field}`;

const RECAPTCHA_UNAVAILABLE =
	"No pudimos cargar la verificación contra spam. Si tienes un bloqueador de anuncios, desactívalo en esta página e inténtalo de nuevo.";

/**
 * Formulario de cotización. Envía a /api/labs/cotizar; el servidor avisa al
 * equipo por Telegram y correo. Sin librerías de formularios: seis campos.
 *
 * - Valida antes de enviar con las mismas reglas que el servidor (`parseQuoteRequest`):
 *   un error de tipeo no gasta los envíos que permite el límite por IP.
 * - El error de un campo va bajo ese campo, que queda marcado (`aria-invalid`) y recibe
 *   el foco; los errores generales (límite, red, verificación) van sobre el botón.
 * - Al enviar, el foco pasa al título de la confirmación.
 * - Contra el spam: campo trampa, límites por IP y por correo en el servidor y reCAPTCHA
 *   v3 cuando hay clave, cargado recién cuando la persona empieza a escribir.
 */
export function QuoteForm({ whatsappHref }: { whatsappHref: string | null }) {
	const [status, setStatus] = useState<Status>({ kind: "idle" });
	const formRef = useRef<HTMLFormElement>(null);
	const sentTitleRef = useRef<HTMLHeadingElement>(null);

	// Tras enviar, el foco cuenta lo que pasó: va al título de confirmación o al campo que hay que corregir.
	useEffect(() => {
		if (status.kind === "sent") {
			sentTitleRef.current?.focus();
			return;
		}
		if (status.kind === "error" && status.field) {
			const field = formRef.current?.elements.namedItem(status.field);
			if (field instanceof HTMLElement) field.focus();
		}
	}, [status]);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (status.kind === "sending") return;
		const form = event.currentTarget;
		const data = Object.fromEntries(new FormData(form).entries());

		const checked = parseQuoteRequest(data);
		if (!checked.ok) {
			setStatus({ kind: "error", message: checked.error, field: checked.field });
			return;
		}

		setStatus({ kind: "sending" });
		try {
			// La ruta exige esta misma acción: un token pedido por otro formulario no sirve.
			const recaptchaToken = await getRecaptchaToken(RECAPTCHA_ACTIONS.labsQuote);
			if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
				setStatus({ kind: "error", message: RECAPTCHA_UNAVAILABLE });
				return;
			}
			const res = await fetch("/api/labs/cotizar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...data, recaptchaToken }),
			});
			const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; field?: QuoteField } | null;
			if (!res.ok || !json?.ok) {
				setStatus({ kind: "error", message: json?.error || "No pudimos enviar la solicitud. Inténtalo de nuevo.", field: json?.field });
				return;
			}
			trackEvent("generate_lead", { method: "labs_quote_form", project_type: checked.value.projectType });
			form.reset();
			setStatus({ kind: "sent" });
		} catch {
			setStatus({ kind: "error", message: "Sin conexión. Revisa tu internet e inténtalo de nuevo." });
		}
	}

	if (status.kind === "sent") {
		return (
			<div role="status" className="rounded-2xl border border-black/[0.08] bg-white p-8">
				<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#4f5bff]/10 text-[#4f5bff]">
					<Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
				</span>
				{/* Recibe el foco al aparecer: el lector de pantalla anuncia la confirmación y el teclado sigue desde aquí. */}
				<h3 ref={sentTitleRef} tabIndex={-1} className="mt-5 text-xl font-semibold tracking-tight text-[#1d1d1f] focus:outline-none">
					Recibimos tu solicitud
				</h3>
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
	const formError = status.kind === "error" && !status.field ? status.message : null;

	/** Marca el campo con error y lo enlaza con su mensaje. */
	const invalid = (name: QuoteField) =>
		errorField === name ? { "aria-invalid": true as const, "aria-describedby": fieldErrorId(name) } : {};
	/** El mensaje bajo el campo con error. */
	const fieldError = (name: QuoteField) =>
		status.kind === "error" && errorField === name ? (
			<p id={fieldErrorId(name)} className="mt-1.5 text-sm text-red-600">
				{status.message}
			</p>
		) : null;

	return (
		<form
			ref={formRef}
			onSubmit={onSubmit}
			// El script de reCAPTCHA se pide al primer foco en el formulario, no al cargar la página.
			onFocus={() => void preloadRecaptcha()}
			// Al corregir el campo marcado, su error desaparece.
			onInput={(event) => {
				const target = event.target as HTMLInputElement;
				if (errorField && target.name === errorField) setStatus({ kind: "idle" });
			}}
			noValidate
			className="rounded-2xl border border-black/[0.08] bg-white p-6 sm:p-8"
		>
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
						className={cn(FIELD, errorField === "name" && FIELD_INVALID)}
						{...invalid("name")}
					/>
					{fieldError("name")}
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
						className={cn(FIELD, errorField === "company" && FIELD_INVALID)}
						{...invalid("company")}
					/>
					{fieldError("company")}
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
						className={cn(FIELD, errorField === "email" && FIELD_INVALID)}
						{...invalid("email")}
					/>
					{fieldError("email")}
				</div>
				<div>
					<label htmlFor="labs-phone" className={LABEL}>
						WhatsApp <span className="font-normal text-[#6e6e73]">(opcional)</span>
					</label>
					<input
						id="labs-phone"
						name="phone"
						type="tel"
						autoComplete="tel"
						placeholder="+56 9 1234 5678"
						maxLength={LABS_QUOTE_LIMITS.phone}
						className={cn(FIELD, errorField === "phone" && FIELD_INVALID)}
						{...invalid("phone")}
					/>
					{fieldError("phone")}
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
						className={cn(FIELD, errorField === "projectType" && FIELD_INVALID)}
						{...invalid("projectType")}
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
					{fieldError("projectType")}
				</div>
				<div>
					<label htmlFor="labs-budget" className={LABEL}>
						Presupuesto estimado
					</label>
					<select
						id="labs-budget"
						name="budget"
						defaultValue=""
						className={cn(FIELD, errorField === "budget" && FIELD_INVALID)}
						{...invalid("budget")}
					>
						{LABS_QUOTE_BUDGETS.map((budget) => (
							<option key={budget.value || "none"} value={budget.value}>
								{budget.label}
							</option>
						))}
					</select>
					{fieldError("budget")}
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
						className={cn(FIELD, "resize-y", errorField === "message" && FIELD_INVALID)}
						{...invalid("message")}
					/>
					{fieldError("message")}
				</div>
				{/* Campo trampa para bots: oculto a personas y a lectores de pantalla. */}
				<div className="hidden" aria-hidden>
					<label htmlFor="labs-website">Sitio web</label>
					<input id="labs-website" name="website" tabIndex={-1} autoComplete="off" />
				</div>
			</div>

			{formError ? (
				<div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<p>{formError}</p>
					{whatsappHref ? (
						<a
							href={whatsappHref}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-red-800 underline decoration-red-800/30 underline-offset-4 hover:decoration-red-800/70"
						>
							Escribir por WhatsApp
							<ArrowRight className="h-3.5 w-3.5" aria-hidden />
						</a>
					) : null}
				</div>
			) : null}

			<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<button
					type="submit"
					disabled={status.kind === "sending"}
					className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#1d1d1f] px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2c2c34] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f5bff] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
				>
					{status.kind === "sending" ? "Enviando…" : "Enviar solicitud"}
					<ArrowRight className="h-4 w-4" aria-hidden />
				</button>
				<p className="text-xs leading-relaxed text-[#6e6e73]">
					Usamos estos datos solo para responderte y no te sumamos a listas de correo. Más en la{" "}
					{/* En otra pestaña, como en el alta: leerla no borra lo que ya se escribió. */}
					<Link
						href="/onboarding/privacidad"
						target="_blank"
						className="underline decoration-black/20 underline-offset-2 hover:decoration-black/60"
					>
						política de privacidad
					</Link>
					.
				</p>
			</div>
		</form>
	);
}
