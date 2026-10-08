"use client";

import { useState, type ChangeEvent } from "react";
import { LifeBuoy, Mail } from "lucide-react";

import type { CompanySenderStatus } from "@/lib/email/company-sender";
import type { EmailSenderForm, UseEmailSenderReturn } from "../hooks/use-email-sender";
import { fmtDate } from "../shared/customer-account-format";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useConfirmDialog } from "../ui/ConfirmDialog";
import { Skeleton } from "../ui/Skeleton";

const inputClass =
	"h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const labelClass = "mb-1.5 block text-xs font-medium text-[#6e6e73]";
const hintClass = "mt-1 text-xs text-[#6e6e73]";

const formFrom = (sender: CompanySenderStatus | null): EmailSenderForm => ({
	apiKey: "",
	fromEmail: sender?.fromEmail ?? "",
	fromName: sender?.fromName ?? "",
	replyTo: sender?.replyTo ?? "",
});

export type CouponEmailSenderCardProps = {
	emailSender: UseEmailSenderReturn;
	timezone?: string | null;
	/** Abre Soporte con un ticket ya escrito pidiendo que lo configuremos nosotros. */
	onAskSupport?: (customDomain: string) => void;
};

/**
 * Correo desde el que salen los cupones que el negocio manda a sus clientes.
 * Sin dominio propio vigente salen por el Resend de GodCode con el nombre del negocio.
 * Con dominio propio, el CEO conecta aquí su Resend: al guardar se manda una prueba a
 * su correo y solo se guarda si sale.
 */
export function CouponEmailSenderCard({ emailSender, timezone, onAskSupport }: CouponEmailSenderCardProps) {
	const { loading, error, ok, status } = emailSender;

	if (!status) {
		if (loading || !error) {
			return (
				<Card className="space-y-3 p-4 sm:p-5">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-full max-w-md" />
					<Skeleton className="h-24 w-full" />
				</Card>
			);
		}
		return (
			<Card className="space-y-4 p-4 sm:p-5">
				<CardHeading />
				<Alert
					variant="danger"
					action={
						<Button variant="secondary" size="sm" onClick={() => void emailSender.reload()}>
							Reintentar
						</Button>
					}
				>
					{error}
				</Alert>
			</Card>
		);
	}

	const { customDomain, sender } = status;

	if (!customDomain) {
		return (
			<Card className="space-y-4 p-4 sm:p-5">
				<CardHeading />
				{ok ? <Alert variant="success">{ok}</Alert> : null}
				<p className="text-sm text-[#6e6e73]">
					Tu negocio no tiene dominio propio: tus cupones salen desde GodCode con el nombre de tu negocio y las
					respuestas llegan al correo de tu cuenta. No hay nada que configurar.
				</p>
			</Card>
		);
	}

	return (
		<Card className="space-y-4 p-4 sm:p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<CardHeading />
				{sender?.verifiedAt ? <Badge variant="success">Conectado</Badge> : <Badge variant="warning">Sin conectar</Badge>}
			</div>

			<p className="text-sm text-[#6e6e73]">
				{sender?.verifiedAt
					? `Tus cupones salen por tu Resend desde ${sender.fromEmail}. Verificado el ${fmtDate(sender.verifiedAt, timezone)}.`
					: `Tu negocio tiene dominio propio (${customDomain}), pero tus cupones todavía salen desde GodCode. Conecta tu cuenta de Resend para que salgan desde tu dominio.`}
			</p>

			{sender?.lastError ? <Alert variant="danger">Último error de Resend: {sender.lastError}</Alert> : null}
			{error ? <Alert variant="danger">{error}</Alert> : null}
			{ok ? <Alert variant="success">{ok}</Alert> : null}

			{/* Se reinicia con lo guardado cada vez que cambia el remitente. */}
			<SenderForm
				key={`${sender?.updatedAt ?? "none"}:${sender?.fromEmail ?? ""}`}
				emailSender={emailSender}
				customDomain={customDomain}
				sender={sender}
			/>

			{onAskSupport ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] px-3.5 py-3">
					<p className="text-sm text-[#6e6e73]">¿No sabes cómo hacerlo? Pídenos ayuda y lo dejamos listo.</p>
					<Button variant="secondary" size="sm" icon={<LifeBuoy size={14} />} onClick={() => onAskSupport(customDomain)}>
						Pedir ayuda a Soporte
					</Button>
				</div>
			) : null}
		</Card>
	);
}

function CardHeading() {
	return (
		<div className="space-y-1">
			<h2 className="flex items-center gap-2 text-base font-semibold text-[#1d1d1f]">
				<Mail size={16} aria-hidden /> Correo de los cupones
			</h2>
			<p className="text-sm text-[#6e6e73]">
				Desde qué correo reciben tus clientes los cupones que les mandas desde el panel (Clientes).
			</p>
		</div>
	);
}

function SenderForm({
	emailSender,
	customDomain,
	sender,
}: {
	emailSender: UseEmailSenderReturn;
	customDomain: string;
	sender: CompanySenderStatus | null;
}) {
	const { saving, save, remove } = emailSender;
	const [form, setForm] = useState<EmailSenderForm>(() => formFrom(sender));
	const { confirm, ConfirmDialogNode } = useConfirmDialog();

	const set = (field: keyof EmailSenderForm) => (e: ChangeEvent<HTMLInputElement>) =>
		setForm((prev) => ({ ...prev, [field]: e.target.value }));

	const onRemove = async () => {
		const yes = await confirm({
			title: "¿Quitar tu Resend?",
			description: "Tus cupones volverán a salir desde GodCode con el nombre de tu negocio.",
			confirmLabel: "Quitar",
			tone: "danger",
		});
		if (yes) await remove();
	};

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				void save({
					apiKey: form.apiKey.trim(),
					fromEmail: form.fromEmail.trim(),
					fromName: form.fromName.trim(),
					replyTo: form.replyTo.trim(),
				});
			}}
		>
			{ConfirmDialogNode}
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="sm:col-span-2">
					<label htmlFor="sender-api-key" className={labelClass}>
						API key de Resend
					</label>
					<input
						id="sender-api-key"
						type="password"
						autoComplete="off"
						spellCheck={false}
						disabled={saving}
						className={inputClass}
						placeholder={sender?.apiKeyLast4 ? `Guardada (••••${sender.apiKeyLast4}). Déjala vacía para no cambiarla.` : "re_…"}
						value={form.apiKey}
						onChange={set("apiKey")}
					/>
					<p className={hintClass}>En resend.com › API Keys. Basta con permiso de envío («Sending access»).</p>
				</div>
				<div>
					<label htmlFor="sender-from-email" className={labelClass}>
						Correo remitente
					</label>
					<input
						id="sender-from-email"
						type="email"
						disabled={saving}
						className={inputClass}
						placeholder={`cupones@${customDomain}`}
						value={form.fromEmail}
						onChange={set("fromEmail")}
					/>
				</div>
				<div>
					<label htmlFor="sender-from-name" className={labelClass}>
						Nombre que se ve
					</label>
					<input
						id="sender-from-name"
						type="text"
						disabled={saving}
						className={inputClass}
						placeholder="El nombre de tu negocio"
						maxLength={80}
						value={form.fromName}
						onChange={set("fromName")}
					/>
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="sender-reply-to" className={labelClass}>
						Respuestas a (opcional)
					</label>
					<input
						id="sender-reply-to"
						type="email"
						disabled={saving}
						className={inputClass}
						placeholder={`hola@${customDomain}`}
						value={form.replyTo}
						onChange={set("replyTo")}
					/>
					<p className={hintClass}>
						El dominio del remitente tiene que estar verificado en tu Resend. Al guardar te llega un correo de prueba.
					</p>
				</div>
			</div>

			<div className="flex flex-wrap justify-end gap-2">
				{sender ? (
					<Button type="button" variant="ghost" disabled={saving} onClick={() => void onRemove()}>
						Quitar
					</Button>
				) : null}
				<Button type="submit" variant="primary" loading={saving}>
					{saving ? "Probando…" : "Probar y guardar"}
				</Button>
			</div>
		</form>
	);
}
