"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ShieldCheck } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { WordmarkReveal } from "../../../components/ui/logo";
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
	const [activeTab, setActiveTab] = useState<"login" | "register">("login");

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
			<div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
				Tu usuario no tiene acceso a un panel activo. Escribe a soporte para habilitar tu cuenta.
			</div>
		) : null;

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#F5F7FF] via-[#FAFBFF] to-white px-4 py-8 sm:px-6">
			<div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#4F5BFF]/[0.06] blur-3xl" />
			<div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#4F5BFF]/[0.05] blur-3xl" />

			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
				className="relative w-full max-w-[420px] rounded-[32px] bg-white p-6 shadow-[0_24px_80px_-24px_rgba(79,91,255,0.16)] sm:p-10"
			>
				<div className="mb-8 flex flex-col items-center text-center">
					<div className="mb-6">
					<WordmarkReveal
						ink="#18181b"
						panelBg="#ffffff"
						markClassName="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
						wordSize="clamp(42px, 7.5vw, 50px)"
					/>
					</div>
				</div>

				{showSuccess ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</div>
						<p className="text-base font-medium text-zinc-900">Acceso concedido</p>
						<p className="text-sm text-zinc-500">Redirigiendo al panel...</p>
					</div>
				) : phase === "mfa" ? (
					<div className="flex flex-col gap-5">
						<div className="text-center">
							<div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#4F5BFF]/10 text-[#4F5BFF]">
								<ShieldCheck size={24} />
							</div>
							<h2 className="text-lg font-semibold text-zinc-900">Verificación de dos pasos</h2>
							<p className="mt-1 text-sm text-zinc-500">
								Abre tu app de autenticación e introduce el código de 6 dígitos.
							</p>
						</div>

						<form className="flex flex-col gap-4" onSubmit={handleSubmitMfa}>
							<div>
								<label htmlFor="login-mfa-code" className="mb-1.5 block text-sm font-medium text-zinc-700">
									Código TOTP
								</label>
								<Input
									id="login-mfa-code"
									value={mfaCode}
									onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
									inputMode="numeric"
									autoComplete="one-time-code"
									placeholder="000000"
									className="h-12 text-center font-mono text-2xl tracking-[0.5em]"
									disabled={loading}
									autoFocus
								/>
							</div>

							{error ? (
								<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
									{error}
								</div>
							) : null}

							<Button
								type="submit"
								loading={loading}
								size="lg"
								className="mt-1 w-full rounded-xl bg-[#4F5BFF] text-white hover:bg-[#3f49cc] focus-visible:ring-[#4F5BFF]"
							>
								Verificar e ingresar
							</Button>

							<button
								type="button"
								onClick={() => void handleAbandonMfa()}
								disabled={loading}
								className="text-center text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
							>
								Usar otra cuenta
							</button>
						</form>
					</div>
				) : (
					<div className="flex flex-col gap-5">
						<div className="flex rounded-full bg-zinc-100 p-1">
							<button
								type="button"
								onClick={() => setActiveTab("login")}
								className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
									activeTab === "login"
										? "bg-white text-zinc-900 shadow-sm"
										: "text-zinc-500 hover:text-zinc-700"
								}`}
							>
								Iniciar sesión
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("register")}
								className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
									activeTab === "register"
										? "bg-white text-zinc-900 shadow-sm"
										: "text-zinc-500 hover:text-zinc-700"
								}`}
							>
								Registro
							</button>
						</div>

						<AnimatePresence mode="wait">
							{activeTab === "login" ? (
								<motion.div
									key="login"
									initial={{ opacity: 0, x: -8 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: 8 }}
									transition={{ duration: 0.2 }}
									className="flex flex-col gap-5"
								>
									<div>
										<h1 className="text-xl font-semibold text-zinc-900">Iniciar sesión</h1>
										<p className="mt-1 text-sm text-zinc-500">Ingresa tus datos para acceder al panel.</p>
									</div>

									<form className="flex flex-col gap-4" onSubmit={handleSubmitCredentials}>
										<div className="flex flex-col gap-1.5">
											<label htmlFor="login-email" className="text-sm font-medium text-zinc-700">
												Email
											</label>
											<div className="relative">
												<Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
												<input
													id="login-email"
													type="email"
													value={email}
													onChange={(event) => setEmail(event.target.value)}
													className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#4F5BFF] focus:ring-4 focus:ring-[#4F5BFF]/10"
													placeholder="admin@empresa.com"
													autoComplete="email"
													required
												/>
											</div>
										</div>

										<div className="flex flex-col gap-1.5">
											<div className="flex items-center justify-between">
												<label htmlFor="login-password" className="text-sm font-medium text-zinc-700">
													Contraseña
												</label>
												<button
													type="button"
													className="text-xs font-medium text-[#4F5BFF] hover:underline"
													onClick={() => alert("Recuperación de contraseña próximamente.")}
												>
													¿Olvidaste tu contraseña?
												</button>
											</div>
											<div className="relative">
												<Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
												<input
													id="login-password"
													type="password"
													value={password}
													onChange={(event) => setPassword(event.target.value)}
													className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#4F5BFF] focus:ring-4 focus:ring-[#4F5BFF]/10"
													placeholder="••••••••"
													autoComplete="current-password"
													required
												/>
											</div>
										</div>

										{error ? (
											<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
												{error}
											</div>
										) : null}

										{noAccessBanner}

										<Button
											type="submit"
											loading={loading}
											size="lg"
											className="mt-1 w-full rounded-xl bg-[#4F5BFF] text-white hover:bg-[#3f49cc] focus-visible:ring-[#4F5BFF]"
										>
											Entrar
										</Button>
									</form>
								</motion.div>
							) : (
								<motion.div
									key="register"
									initial={{ opacity: 0, x: 8 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -8 }}
									transition={{ duration: 0.2 }}
									className="flex flex-col gap-5"
								>
									<div>
										<h1 className="text-xl font-semibold text-zinc-900">Crear cuenta</h1>
										<p className="mt-1 text-sm text-zinc-500">
											Para empezar a vender online, completa el registro en el onboarding.
										</p>
									</div>

									<Link
										href="/onboarding"
										className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#4F5BFF] px-5 text-base font-medium text-white transition hover:bg-[#3f49cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F5BFF] focus-visible:ring-offset-2"
									>
										Redirigirme al onboarding
									</Link>

									<p className="text-center text-xs text-zinc-400">
										¿Ya tienes cuenta?{" "}
										<button
											type="button"
											onClick={() => setActiveTab("login")}
											className="font-medium text-[#4F5BFF] hover:underline"
										>
											Inicia sesión
										</button>
									</p>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
			</motion.div>
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
