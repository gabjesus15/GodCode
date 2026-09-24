"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MailCheck } from "lucide-react";

import { AuthCard, authInputClass, authPrimaryButtonClass } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function RecoverPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/auth/recuperar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(data.error || "No pudimos enviar el enlace. Intenta de nuevo.");
			setSentTo(email.trim());
		} catch (err) {
			setError(err instanceof Error ? err.message : "No pudimos enviar el enlace. Intenta de nuevo.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthCard>
			{sentTo ? (
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F5BFF]/10 text-[#4F5BFF]">
						<MailCheck className="h-6 w-6" aria-hidden />
					</div>
					<h1 className="text-lg font-semibold text-zinc-900">Revisa tu correo</h1>
					<p className="text-sm leading-relaxed text-zinc-500">
						Si <strong className="font-medium text-zinc-700">{sentTo}</strong> tiene una cuenta, te llegará un enlace para
						elegir una nueva contraseña. Puede tardar un par de minutos; mira también en spam.
					</p>
					<Link href="/login" className="mt-2 text-sm font-medium text-[#4F5BFF] hover:underline">
						Volver a iniciar sesión
					</Link>
				</div>
			) : (
				<div className="flex flex-col gap-5">
					<div>
						<h1 className="text-xl font-semibold text-zinc-900">Recupera tu acceso</h1>
						<p className="mt-1 text-sm text-zinc-500">
							Escribe el correo con el que entras al panel y te enviamos un enlace para elegir una nueva contraseña.
						</p>
					</div>

					<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="recover-email" className="text-sm font-medium text-zinc-700">
								Email
							</label>
							<div className="relative">
								<Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" aria-hidden />
								<input
									id="recover-email"
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									className={authInputClass}
									placeholder="tu@negocio.com"
									autoComplete="email"
									required
									autoFocus
								/>
							</div>
						</div>

						{error ? (
							<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{error}
							</div>
						) : null}

						<Button type="submit" loading={loading} size="lg" className={authPrimaryButtonClass}>
							Enviar enlace
						</Button>
					</form>

					<Link href="/login" className="text-center text-sm font-medium text-zinc-500 hover:text-zinc-700 hover:underline">
						Volver a iniciar sesión
					</Link>
				</div>
			)}
		</AuthCard>
	);
}
