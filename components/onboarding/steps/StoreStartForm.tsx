"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, Loader2, Store, TriangleAlert } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics/track-event";
import { BUSINESS_SECTOR_OPTIONS, type BusinessSectorLocale } from "@/lib/onboarding/business-sectors";
import { resolveOnboardingLocale } from "@/lib/onboarding/onboarding-ui-copy";
import { MAX_OWNER_PASSWORD_LENGTH, MIN_OWNER_PASSWORD_LENGTH } from "@/lib/onboarding/owner-password-rules";
import type { StoreStartCopy } from "@/lib/onboarding/store-start-copy";
// La misma regla del link que el servidor (sin imports de servidor): lo que se ve aquí es lo que se crea.
import { normalizeStoreSlug, STORE_SLUG_MAX, STORE_SLUG_MIN } from "@/lib/onboarding/store-slug";
import { cn } from "@/utils/cn";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type SlugState =
	| { kind: "idle" }
	| { kind: "checking" }
	| { kind: "available" }
	| { kind: "taken"; suggestion: string | null }
	| { kind: "short" }
	| { kind: "reserved" };

type Outcome = { kind: "existing" } | { kind: "created" } | null;

const fieldClass = "h-12 rounded-xl px-4 text-[15px]";

function fill(text: string, values: Record<string, string>): string {
	return text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

/**
 * «Crear mi tienda»: nombre, link (con aviso en vivo de si está libre), tipo de negocio y
 * contraseña. Al crearla entra con esa contraseña y va directo a «Configura tu tienda».
 */
export function StoreStartForm({
	token,
	email,
	initialName,
	initialSlug,
	initialSector,
	linkPrefix,
	copy,
}: {
	token: string;
	email: string;
	initialName: string;
	initialSlug: string;
	initialSector: string | null;
	/** `godcode.me/` (lo que va antes del link). */
	linkPrefix: string;
	copy: StoreStartCopy;
}) {
	const locale = resolveOnboardingLocale(useLocale()) as BusinessSectorLocale;
	const ids = { name: useId(), slug: useId(), slugHint: useId(), password: useId(), passwordHint: useId() };

	const [name, setName] = useState(initialName);
	const [slug, setSlug] = useState(initialSlug);
	const [slugTouched, setSlugTouched] = useState(false);
	const [slugState, setSlugState] = useState<SlugState>({ kind: "available" });
	const [sector, setSector] = useState<string | null>(initialSector);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [outcome, setOutcome] = useState<Outcome>(null);

	const prefixRef = useRef<HTMLSpanElement>(null);
	const [prefixWidth, setPrefixWidth] = useState(0);
	useLayoutEffect(() => {
		setPrefixWidth(prefixRef.current?.offsetWidth ?? 0);
	}, [linkPrefix]);

	// Mientras el dueño no toque el link, sigue al nombre.
	useEffect(() => {
		if (!slugTouched) setSlug(normalizeStoreSlug(name));
	}, [name, slugTouched]);

	useEffect(() => {
		if (slug === initialSlug) {
			setSlugState({ kind: "available" });
			return undefined;
		}
		if (slug.length < STORE_SLUG_MIN) {
			setSlugState(slug ? { kind: "short" } : { kind: "idle" });
			return undefined;
		}
		setSlugState({ kind: "checking" });
		const controller = new AbortController();
		const timer = window.setTimeout(() => {
			fetch(`/api/onboarding/store-slug?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
				.then((res) => res.json())
				.then((data: { available?: boolean; reason?: string; suggestion?: string | null }) => {
					if (data.available) setSlugState({ kind: "available" });
					else if (data.reason === "reserved") setSlugState({ kind: "reserved" });
					else if (data.reason === "short") setSlugState({ kind: "short" });
					else setSlugState({ kind: "taken", suggestion: data.suggestion ?? null });
				})
				.catch(() => {
					if (!controller.signal.aborted) setSlugState({ kind: "idle" });
				});
		}, 350);
		return () => {
			controller.abort();
			window.clearTimeout(timer);
		};
	}, [slug, token, initialSlug]);

	const slugBlocked = slugState.kind === "taken" || slugState.kind === "short" || slugState.kind === "reserved";

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (slugBlocked || loading) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/onboarding/start-store", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, business_name: name, slug, sector, password }),
			});
			const data = (await res.json().catch(() => ({}))) as { email?: string; error?: string; code?: string };
			if (!res.ok || !data.email) {
				if (data.code === "existing_account") return setOutcome({ kind: "existing" });
				if (data.code === "already_created") return setOutcome({ kind: "created" });
				// «Solo panel CEO»: sin tienda que armar, sigue a elegir el plan y pagar.
				if (data.code === "panel_only") return window.location.assign(`/onboarding/complete?token=${encodeURIComponent(token)}`);
				if (data.code === "slug_taken") setSlugState({ kind: "taken", suggestion: null });
				// Si falló al crearla, el servidor ya deshizo todo: se avisa en el idioma de la
				// página y el formulario queda listo para reintentar. Los rechazos con motivo
				// (link, contraseña, demasiados intentos) traen su propio texto.
				setError(data.code === "error" || res.status >= 500 || !data.error ? copy.errorGeneric : data.error);
				return;
			}
			trackEvent("store_created", { flow: "draft", sector: sector ?? "" });

			const supabase = createSupabaseBrowserClient("super-admin");
			await supabase.auth.signOut({ scope: "local" });
			const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password });
			if (signInError) {
				setOutcome({ kind: "created" });
				setError(copy.errorSignIn);
				return;
			}
			window.location.assign("/cuenta/configurar");
		} catch {
			// Sin conexión o respuesta ilegible: el texto técnico del navegador no ayuda.
			setError(copy.errorGeneric);
		} finally {
			setLoading(false);
		}
	};

	if (outcome) {
		const existing = outcome.kind === "existing";
		return (
			<div role="status" className="rounded-2xl border border-slate-200 p-6 sm:p-8">
				<span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF0FF] text-[#3640C9]">
					<Store className="h-5 w-5" aria-hidden />
				</span>
				<h2 className="mt-5 text-xl font-semibold text-slate-900">{existing ? fill(copy.existingTitle, { email }) : copy.createdTitle}</h2>
				<p className="mt-2 text-[15px] leading-relaxed text-slate-600">{error && !existing ? error : existing ? copy.existingBody : copy.createdBody}</p>
				<div className="mt-6 flex flex-wrap gap-3">
					<Link href="/login" className="onboarding-btn-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm">
						{existing ? copy.existingLogin : copy.login}
					</Link>
					{existing ? (
						<Link
							href={`/onboarding/complete?token=${encodeURIComponent(token)}`}
							className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
						>
							{copy.existingClassic}
						</Link>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-7">
			<div className="space-y-2">
				<label htmlFor={ids.name} className="block text-sm font-medium text-slate-800">
					{copy.storeName}
				</label>
				<Input
					id={ids.name}
					className={fieldClass}
					value={name}
					onChange={(event) => setName(event.target.value)}
					autoComplete="organization"
					required
					minLength={2}
					maxLength={120}
				/>
				<p className="text-xs text-slate-500">{copy.storeNameHint}</p>
			</div>

			<div className="space-y-2">
				<label htmlFor={ids.slug} className="block text-sm font-medium text-slate-800">
					{copy.link}
				</label>
				<div className="relative">
					<span
						ref={prefixRef}
						aria-hidden
						className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none text-[15px] text-slate-400"
					>
						{linkPrefix}
					</span>
					<Input
						id={ids.slug}
						className={cn(fieldClass, "font-medium")}
						style={prefixWidth ? { paddingLeft: `calc(1rem + ${prefixWidth}px)` } : undefined}
						value={slug}
						onChange={(event) => {
							setSlugTouched(true);
							setSlug(normalizeStoreSlug(event.target.value.replace(/\s/g, "-")) + (/[\s-]$/.test(event.target.value) ? "-" : ""));
						}}
						onBlur={() => setSlug((value) => normalizeStoreSlug(value))}
						aria-describedby={ids.slugHint}
						aria-invalid={slugBlocked || undefined}
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						inputMode="url"
						required
						maxLength={STORE_SLUG_MAX}
					/>
				</div>
				<p id={ids.slugHint} className="flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs" aria-live="polite">
					{slugState.kind === "checking" ? (
						<span className="inline-flex items-center gap-1.5 text-slate-500">
							<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
							{copy.linkChecking}
						</span>
					) : slugState.kind === "available" ? (
						<span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
							<Check className="h-3.5 w-3.5" aria-hidden />
							{copy.linkAvailable}
						</span>
					) : slugState.kind === "idle" ? null : (
						<>
							<span className="inline-flex items-center gap-1.5 font-medium text-red-600">
								<TriangleAlert className="h-3.5 w-3.5" aria-hidden />
								{slugState.kind === "taken" ? copy.linkTaken : slugState.kind === "short" ? copy.linkShort : copy.linkReserved}
							</span>
							{slugState.kind === "taken" && slugState.suggestion ? (
								<button
									type="button"
									className="onboarding-link-brand"
									onClick={() => {
										setSlugTouched(true);
										setSlug(slugState.suggestion ?? "");
									}}
								>
									{fill(copy.linkUseSuggestion, { slug: slugState.suggestion })}
								</button>
							) : null}
						</>
					)}
				</p>
			</div>

			<fieldset className="space-y-2.5">
				<legend className="block text-sm font-medium text-slate-800">{copy.sector}</legend>
				<div className="flex flex-wrap gap-2">
					{BUSINESS_SECTOR_OPTIONS.map((option) => {
						const active = sector === option.value;
						return (
							<button
								key={option.value}
								type="button"
								aria-pressed={active}
								onClick={() => setSector(active ? null : option.value)}
								className={cn(
									"inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition",
									active
										? "border-slate-900 bg-slate-900 text-white shadow-[0_6px_16px_-10px_rgba(15,23,42,0.6)]"
										: "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
								)}
							>
								{active ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
								{option.label[locale]}
							</button>
						);
					})}
				</div>
				<p className="text-xs text-slate-500">{copy.sectorHint}</p>
			</fieldset>

			<div className="space-y-2">
				<label htmlFor={ids.password} className="block text-sm font-medium text-slate-800">
					{copy.password}
				</label>
				<div className="relative">
					<Input
						id={ids.password}
						type={showPassword ? "text" : "password"}
						className={cn(fieldClass, "pr-12")}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						aria-describedby={ids.passwordHint}
						autoComplete="new-password"
						required
						minLength={MIN_OWNER_PASSWORD_LENGTH}
						maxLength={MAX_OWNER_PASSWORD_LENGTH}
					/>
					<button
						type="button"
						onClick={() => setShowPassword((value) => !value)}
						aria-label={showPassword ? copy.hidePassword : copy.showPassword}
						className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
					>
						{showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
					</button>
				</div>
				<p id={ids.passwordHint} className="text-xs text-slate-500">
					{copy.passwordHint} {fill(copy.signInAs, { email })}
				</p>
			</div>

			{error ? (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
					{error}
				</div>
			) : null}

			<div className="space-y-3">
				<Button
					type="submit"
					loading={loading}
					disabled={slugBlocked || slugState.kind === "checking"}
					size="lg"
					className="onboarding-btn-primary h-12 w-full rounded-xl text-[15px]"
				>
					{loading ? copy.submitting : copy.submit}
				</Button>
				<p className="text-center text-xs leading-relaxed text-slate-500">{copy.footnote}</p>
			</div>
		</form>
	);
}
