import Link from "next/link";
import { KeyRound } from "lucide-react";

import { AuthCard, authPrimaryButtonClass } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Paso intermedio del enlace «Crear mi contraseña»: el token se canjea al pulsar el botón
 * (POST a `/login/confirmar`), no al abrir el enlace, para que el antivirus del correo no
 * lo gaste antes que la persona.
 */
export default async function ActivateAccessPage({
	searchParams,
}: {
	searchParams?: Promise<{ token_hash?: string; type?: string }>;
}) {
	const params = searchParams ? await searchParams : undefined;
	const tokenHash = String(params?.token_hash ?? "").trim().slice(0, 200);
	const valid = Boolean(tokenHash) && params?.type === "recovery";

	return (
		<AuthCard>
			<div className="flex flex-col items-center gap-3 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F5BFF]/10 text-[#4F5BFF]">
					<KeyRound className="h-6 w-6" aria-hidden />
				</div>
				{valid ? (
					<>
						<h1 className="text-xl font-semibold text-zinc-900">Crea tu contraseña</h1>
						<p className="text-sm leading-relaxed text-zinc-500">
							Pulsa el botón para elegir tu contraseña y entrar a tu cuenta.
						</p>
						<form method="post" action="/login/confirmar" className="mt-2 w-full">
							<input type="hidden" name="token_hash" value={tokenHash} />
							<input type="hidden" name="type" value="recovery" />
							<Button type="submit" className={`h-12 ${authPrimaryButtonClass}`}>
								Crear mi contraseña
							</Button>
						</form>
					</>
				) : (
					<>
						<h1 className="text-xl font-semibold text-zinc-900">Este enlace no sirve</h1>
						<p className="text-sm leading-relaxed text-zinc-500">Pide uno nuevo con tu correo y te lo enviamos al momento.</p>
						<Link href="/login/recuperar" className="mt-2 text-sm font-medium text-[#4F5BFF] hover:underline">
							Pedir un enlace nuevo
						</Link>
					</>
				)}
			</div>
		</AuthCard>
	);
}
