"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { requireAdminRole, roleSets } from "@/utils/admin";

type CompanyDeleteButtonProps = {
	companyId: string;
	companyName: string | null;
	publicSlug: string | null;
	readOnly?: boolean;
};

function normalizeTotp(input: string): string {
	return input.replace(/\s/g, "");
}

export function CompanyDeleteButton({ companyId, companyName, publicSlug, readOnly }: CompanyDeleteButtonProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [totpCode, setTotpCode] = useState("");
	const [ack, setAck] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (readOnly) {
		return null;
	}

	const digits = normalizeTotp(totpCode);
	const canSubmit = /^\d{6}$/.test(digits) && ack && !loading;

	const displayName = (companyName ?? "").trim() || publicSlug || "esta empresa";

	const reset = () => {
		setTotpCode("");
		setAck(false);
		setError(null);
	};

	const handleClose = () => {
		if (!loading) {
			setOpen(false);
			reset();
		}
	};

	const handleDelete = async () => {
		setError(null);
		const auth = await requireAdminRole(roleSets.destructive);
		if (!auth.ok) {
			setError(auth.error);
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/super-admin/companies/delete", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: companyId, totpCode: digits }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
			if (!res.ok) {
				setError(data.error ?? "No se pudo eliminar la empresa.");
				return;
			}
			setOpen(false);
			reset();
			router.refresh();
		} catch {
			setError("Error de red. Intenta de nuevo.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="shrink-0 gap-1.5 whitespace-nowrap border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
				onClick={() => setOpen(true)}
				title="Eliminar empresa"
				aria-label="Eliminar empresa"
			>
				<Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
				Eliminar
			</Button>
			<Modal
				isOpen={open}
				onClose={handleClose}
				title="Eliminar empresa"
				description={`Vas a borrar permanentemente «${displayName}». Confirma con el código de 6 dígitos de Google Authenticator (MFA) de tu usuario de administrador.`}
				className="max-w-md"
			>
				<div className="space-y-4">
					<div>
						<label htmlFor={`totp-${companyId}`} className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
							Código del autenticador (6 dígitos)
						</label>
						<Input
							id={`totp-${companyId}`}
							value={totpCode}
							onChange={(e) => setTotpCode(e.target.value.replace(/[^\d\s]/g, ""))}
							placeholder="000000"
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={9}
							aria-label="Código TOTP de seis dígitos"
							disabled={loading}
							className="font-mono tracking-widest dark:border-zinc-600 dark:bg-zinc-950"
						/>
						<p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
							El código lo genera la app (Google Authenticator u otra compatible) vinculada a tu cuenta con MFA en Supabase Auth.
						</p>
					</div>
					<label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
						<Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} disabled={loading} className="mt-0.5" />
						<span>Entiendo que esto elimina la empresa de forma permanente y no hay forma de recuperarla.</span>
					</label>
					{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">{error}</p> : null}
					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
							Cancelar
						</Button>
						<Button type="button" variant="destructive" onClick={handleDelete} disabled={!canSubmit}>
							{loading ? "Eliminando…" : "Eliminar definitivamente"}
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
