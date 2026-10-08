"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import type { CompanySenderStatus } from "@/lib/email/company-sender";
import { formatAdminDateTime } from "@/lib/super-admin/admin-format";

import { Field, SectionCard } from "./company-section";

type Status = { customDomain: string | null; sender: CompanySenderStatus | null };

const emptyForm = (sender: CompanySenderStatus | null) => ({
	apiKey: "",
	fromEmail: sender?.fromEmail ?? "",
	fromName: sender?.fromName ?? "",
	replyTo: sender?.replyTo ?? "",
});

/**
 * Resend propio para los cupones por correo. Lo normal es que lo configure el CEO
 * desde su cuenta (/cuenta › Correo de cupones); esto es para cuando nos lo pide por
 * Soporte. Al guardar se manda una prueba al correo del super admin y solo se guarda si sale.
 */
export function CompanyEmailSenderSection({ companyId }: { companyId: string }) {
	const { readOnly } = useAdminRole();
	const [status, setStatus] = useState<Status | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [form, setForm] = useState(() => emptyForm(null));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const url = `/api/super-admin/companies/${companyId}/email-sender`;

	const load = useCallback(async () => {
		try {
			const res = await fetch(url, { cache: "no-store" });
			const data = (await res.json()) as Status & { error?: string };
			if (!res.ok) throw new Error(data.error ?? "No se pudo leer");
			setStatus(data);
			setForm(emptyForm(data.sender));
			setLoadError(null);
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : "No se pudo leer");
		}
	}, [url]);

	useEffect(() => {
		let alive = true;
		void (async () => {
			try {
				const res = await fetch(url, { cache: "no-store" });
				const data = (await res.json()) as Status & { error?: string };
				if (!alive) return;
				if (!res.ok) throw new Error(data.error ?? "No se pudo leer");
				setStatus(data);
				setForm(emptyForm(data.sender));
			} catch (err) {
				if (alive) setLoadError(err instanceof Error ? err.message : "No se pudo leer");
			}
		})();
		return () => {
			alive = false;
		};
	}, [url]);

	const save = async () => {
		setSaving(true);
		setError(null);
		setMessage(null);
		try {
			const res = await fetch(url, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const data = (await res.json()) as { error?: string; testSentTo?: string | null };
			if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
			setMessage(`Guardado. La prueba salió a ${data.testSentTo ?? "tu correo"}.`);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo guardar");
		} finally {
			setSaving(false);
		}
	};

	const remove = async () => {
		if (!window.confirm("¿Quitar el Resend propio? Los cupones volverán a salir por el Resend de GodCode.")) return;
		setSaving(true);
		setError(null);
		setMessage(null);
		try {
			const res = await fetch(url, { method: "DELETE" });
			const data = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(data.error ?? "No se pudo quitar");
			setMessage("Quitado. Los cupones salen por el Resend de GodCode.");
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo quitar");
		} finally {
			setSaving(false);
		}
	};

	const description =
		"Los cupones que el negocio manda a sus clientes. Sin dominio propio salen por el Resend de GodCode con el nombre del negocio.";

	if (loadError) {
		return (
			<SectionCard title="Correo de los cupones" description={description}>
				<p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
			</SectionCard>
		);
	}
	if (!status) return null;

	if (!status.customDomain) {
		return (
			<SectionCard title="Correo de los cupones" description={description}>
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					Este negocio no tiene dominio propio vigente: sus cupones salen por el Resend de GodCode y no hay nada que configurar.
				</p>
			</SectionCard>
		);
	}

	const sender = status.sender;
	return (
		<SectionCard title="Correo de los cupones" description={description}>
			<div className="flex flex-col gap-4">
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					{sender?.verifiedAt
						? `Sale por el Resend del negocio desde ${sender.fromEmail}. Verificado el ${formatAdminDateTime(sender.verifiedAt)}${sender.updatedBy ? ` por ${sender.updatedBy}` : ""}.`
						: `Tiene dominio propio (${status.customDomain}) pero todavía sale por el Resend de GodCode: falta conectar su Resend.`}
				</p>
				{sender?.lastError ? (
					<p className="text-sm text-red-600 dark:text-red-400">Último error de Resend: {sender.lastError}</p>
				) : null}

				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="API key de Resend"
						className="sm:col-span-2"
						hint={sender?.apiKeyLast4 ? `Guardada (••••${sender.apiKeyLast4}). Vacía = no se cambia.` : "La del Resend del negocio, con permiso de envío."}
					>
						<Input
							type="password"
							autoComplete="off"
							disabled={readOnly || saving}
							value={form.apiKey}
							onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
							placeholder="re_…"
						/>
					</Field>
					<Field label="Correo remitente" hint={`El dominio tiene que estar verificado en ese Resend (p. ej. cupones@${status.customDomain}).`}>
						<Input
							type="email"
							disabled={readOnly || saving}
							value={form.fromEmail}
							onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))}
							placeholder={`cupones@${status.customDomain}`}
						/>
					</Field>
					<Field label="Nombre que se ve">
						<Input
							disabled={readOnly || saving}
							value={form.fromName}
							onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
						/>
					</Field>
					<Field label="Respuestas a (opcional)" className="sm:col-span-2">
						<Input
							type="email"
							disabled={readOnly || saving}
							value={form.replyTo}
							onChange={(e) => setForm((f) => ({ ...f, replyTo: e.target.value }))}
						/>
					</Field>
				</div>

				{error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
				{message ? <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{message}</p> : null}

				{readOnly ? null : (
					<div className="flex flex-wrap justify-end gap-2">
						{sender ? (
							<Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => void remove()}>
								Quitar
							</Button>
						) : null}
						<Button type="button" size="sm" loading={saving} onClick={() => void save()}>
							Probar y guardar
						</Button>
					</div>
				)}
			</div>
		</SectionCard>
	);
}
