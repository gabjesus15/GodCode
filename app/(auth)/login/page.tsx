"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { SaasLogo } from "../../../components/super-admin/shell/SaasLogo";
import { mapAuthClientError } from "../../../utils/auth-client-errors";
import { createSupabaseBrowserClient } from "../../../utils/supabase/client";

type AalPayload = { currentLevel?: string; nextLevel?: string };

function needsMfaChallenge(aal: AalPayload | null | undefined): boolean {
	return aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2";
}

type FactorLike = { id: string; status?: string | null; factor_type?: string | null };

async function firstVerifiedTotpFactorId(
	supabase: ReturnType<typeof createSupabaseBrowserClient>,
): Promise<string | null> {
	const { data, error } = await supabase.auth.mfa.listFactors();
	if (error || !data) return null;
	const raw = data as { totp?: FactorLike[]; all?: FactorLike[] };
	const merged = [...(raw.totp ?? []), ...(raw.all ?? []).filter((f) => String(f.factor_type ?? "").toLowerCase() === "totp")];
	const byId = new Map<string, FactorLike>();
	for (const f of merged) {
		if (f?.id) byId.set(f.id, f);
	}
	for (const f of byId.values()) {
		if (String(f.status ?? "").toLowerCase() === "verified") return f.id;
	}
	return null;
}

function LoginPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [showSuccess, setShowSuccess] = useState(false);
	const [phase, setPhase] = useState<"credentials" | "mfa">("credentials");
	const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
	const [mfaCode, setMfaCode] = useState("");

	const finishLoginRedirect = async () => {
		setShowSuccess(true);
		await new Promise((resolve) => setTimeout(resolve, 800));
		router.push("/post-login");
		router.refresh();
	};

	const handleSubmitCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const supabase = createSupabaseBrowserClient("super-admin");
			const normalizedEmail = email.trim().toLowerCase();

			await supabase.auth.signOut();

			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: normalizedEmail,
				password,
			});

			if (signInError) {
				throw signInError;
			}

			const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
			if (aalError) {
				throw aalError;
			}

			if (needsMfaChallenge(aal as AalPayload)) {
				const factorId = await firstVerifiedTotpFactorId(supabase);
				if (!factorId) {
					await supabase.auth.signOut();
					throw new Error(
						"Tu cuenta requiere doble factor pero no hay un autenticador TOTP verificado. Actívalo desde el portal de cuenta o contacta a soporte.",
					);
				}
				setMfaFactorId(factorId);
				setMfaCode("");
				setPhase("mfa");
				return;
			}

			await finishLoginRedirect();
		} catch (err) {
			setError(mapAuthClientError(err));
		} finally {
			setLoading(false);
		}
	};

	const handleAbandonMfa = async () => {
		setLoading(true);
		setError(null);
		try {
			const supabase = createSupabaseBrowserClient("super-admin");
			await supabase.auth.signOut();
			setPhase("credentials");
			setMfaFactorId(null);
			setMfaCode("");
		} catch (err) {
			setError(mapAuthClientError(err));
		} finally {
			setLoading(false);
		}
	};

	const handleSubmitMfa = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!mfaFactorId) return;
		const code = mfaCode.replace(/\s/g, "");
		if (!/^\d{6}$/.test(code)) {
			setError("Introduce el código de 6 dígitos de tu app de autenticación.");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const supabase = createSupabaseBrowserClient("super-admin");
			const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
			if (chErr || !ch?.id) throw chErr ?? new Error("No se pudo iniciar la verificación MFA.");

			const { error: vErr } = await supabase.auth.mfa.verify({
				factorId: mfaFactorId,
				challengeId: ch.id,
				code,
			});
			if (vErr) throw vErr;

			await finishLoginRedirect();
		} catch (err) {
			setError(mapAuthClientError(err));
		} finally {
			setLoading(false);
		}
	};

	const noAccessBanner =
		phase === "credentials" && !error && searchParams?.get("error") === "no-access" ? (
			<div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
				Tu usuario no tiene acceso a un panel activo. Escribe a soporte para habilitar tu cuenta.
			</div>
		) : null;

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#ffffff_55%,_#eef2ff_100%)] px-6 py-10 dark:bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#09090b_55%,_#111827_100%)]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.12),_transparent_45%)] dark:bg-[radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.2),_transparent_45%)]" />

			<Card className="relative w-full max-w-md border-zinc-200/80 bg-white/90 p-7 shadow-[0_20px_50px_-22px_rgba(15,23,42,0.35)] dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:shadow-[0_20px_50px_-22px_rgba(0,0,0,0.75)]">
				<div className="mb-7 flex flex-col items-center text-center">
					<div className="mb-5">
						<SaasLogo size="lg" />
					</div>

					{showSuccess ? (
						<p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Acceso concedido. Redirigiendo...</p>
					) : phase === "mfa" ? (
						<>
							<p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
								<ShieldCheck size={14} />
								Doble factor
							</p>
							<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
								Abre tu app de autenticación (Google Authenticator, Authy, etc.) e introduce el código de 6 dígitos.
							</p>
						</>
					) : (
						<>
							<p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
								<ShieldCheck size={14} />
								Acceso GodCode
							</p>
							<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Ingresa con tu cuenta para ir al panel que te corresponde.</p>
						</>
					)}
				</div>

				{phase === "credentials" ? (
					<form className="flex flex-col gap-4" onSubmit={handleSubmitCredentials}>
						<label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
							Email
							<input
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
								placeholder="admin@empresa.com"
								autoComplete="email"
								required
							/>
						</label>

						<label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
							Password
							<input
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
								placeholder="••••••••"
								autoComplete="current-password"
								required
							/>
						</label>

						{error ? (
							<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
								{error}
							</div>
						) : null}

						{noAccessBanner}

						<Button type="submit" loading={loading} className="mt-1">
							Entrar
						</Button>

						<p className="pt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">Protegido por autenticación segura.</p>
					</form>
				) : (
					<form className="flex flex-col gap-4" onSubmit={handleSubmitMfa}>
						<div className="max-w-full">
							<label htmlFor="login-mfa-code" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
								Código TOTP
							</label>
							<Input
								id="login-mfa-code"
								value={mfaCode}
								onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
								inputMode="numeric"
								autoComplete="one-time-code"
								placeholder="000000"
								className="h-11 font-mono text-lg tracking-[0.35em]"
								disabled={loading}
								autoFocus
							/>
						</div>

						{error ? (
							<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
								{error}
							</div>
						) : null}

						<Button type="submit" loading={loading} className="mt-1">
							Verificar e ingresar
						</Button>

						<button
							type="button"
							onClick={() => void handleAbandonMfa()}
							disabled={loading}
							className="text-center text-sm font-medium text-zinc-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-zinc-400"
						>
							Usar otra cuenta
						</button>
					</form>
				)}
			</Card>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={null}>
			<LoginPageContent />
		</Suspense>
	);
}
