"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Lock } from "lucide-react";

import { AuthCard, authInputClass, authPrimaryButtonClass } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { mapAuthClientError } from "@/utils/auth-client-errors";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Elegir contraseña tras abrir el enlace de bienvenida o de recuperación
 * (`/login/confirmar` ya dejó la sesión en cookies).
 */
export default function NewPasswordPage() {
	const router = useRouter();
	const [sessionState, setSessionState] = useState<"checking" | "ready" | "missing">("checking");
	const [email, setEmail] = useState<string | null>(null);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const checkSession = async () => {
			try {
				const { data } = await createSupabaseBrowserClient("super-admin").auth.getUser();
				if (cancelled) return;
				setEmail(data.user?.email ?? null);
				setSessionState(data.user ? "ready" : "missing");
			} catch {
				if (!cancelled) setSessionState("missing");
			}
		};
		void checkSession();
		return () => {
			cancelled = true;
		};
	}, []);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		if (password.length < MIN_PASSWORD_LENGTH) {
			setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
			return;
		}
		if (password !== confirm) {
			setError("Las contraseñas no coinciden.");
			return;
		}
		setLoading(true);
		try {
			const { error: updateError } = await createSupabaseBrowserClient("super-admin").auth.updateUser({ password });
			if (updateError) throw updateError;
			router.push("/post-login");
			router.refresh();
		} catch (err) {
			setError(mapAuthClientError(err));
			setLoading(false);
		}
	};

	if (sessionState === "checking") {
		return (
			<AuthCard>
				<p className="py-6 text-center text-sm text-zinc-500" role="status">
					Comprobando el enlace…
				</p>
			</AuthCard>
		);
	}

	if (sessionState === "missing") {
		return (
			<AuthCard>
				<div className="flex flex-col items-center gap-3 text-center">
					<h1 className="text-lg font-semibold text-zinc-900">El enlace venció o ya se usó</h1>
					<p className="text-sm leading-relaxed text-zinc-500">
						Por seguridad, cada enlace sirve una sola vez. Pide uno nuevo y te llegará al correo.
					</p>
					<Link
						href="/login/recuperar"
						className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[#4F5BFF] px-5 text-sm font-medium text-white transition hover:bg-[#3f49cc]"
					>
						Pedir un enlace nuevo
					</Link>
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard>
			<div className="flex flex-col gap-5">
				<div>
					<div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#4F5BFF]/10 text-[#4F5BFF]">
						<KeyRound className="h-5 w-5" aria-hidden />
					</div>
					<h1 className="text-xl font-semibold text-zinc-900">Elige tu contraseña</h1>
					<p className="mt-1 text-sm text-zinc-500">
						{email ? (
							<>
								Para <strong className="font-medium text-zinc-700">{email}</strong>. La usarás cada vez que entres.
							</>
						) : (
							"La usarás cada vez que entres."
						)}
					</p>
				</div>

				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<input type="email" name="username" autoComplete="username" value={email ?? ""} readOnly hidden />
					<div className="flex flex-col gap-1.5">
						<label htmlFor="new-password" className="text-sm font-medium text-zinc-700">
							Nueva contraseña
						</label>
						<div className="relative">
							<Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" aria-hidden />
							<input
								id="new-password"
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className={authInputClass}
								autoComplete="new-password"
								minLength={MIN_PASSWORD_LENGTH}
								aria-describedby="new-password-hint"
								required
								autoFocus
							/>
						</div>
						<p id="new-password-hint" className="text-xs text-zinc-500">
							Mínimo {MIN_PASSWORD_LENGTH} caracteres. Mejor una frase que una palabra.
						</p>
					</div>

					<div className="flex flex-col gap-1.5">
						<label htmlFor="confirm-password" className="text-sm font-medium text-zinc-700">
							Repite la contraseña
						</label>
						<div className="relative">
							<Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" aria-hidden />
							<input
								id="confirm-password"
								type="password"
								value={confirm}
								onChange={(event) => setConfirm(event.target.value)}
								className={authInputClass}
								autoComplete="new-password"
								required
							/>
						</div>
					</div>

					{error ? (
						<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</div>
					) : null}

					<Button type="submit" loading={loading} size="lg" className={authPrimaryButtonClass}>
						Guardar y entrar
					</Button>
				</form>
			</div>
		</AuthCard>
	);
}
