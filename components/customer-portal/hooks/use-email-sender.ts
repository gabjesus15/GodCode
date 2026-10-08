"use client";

import { useCallback, useEffect, useState } from "react";

import type { CompanySenderStatus } from "@/lib/email/company-sender";

const ENDPOINT = "/api/customer-account/email-sender";

export type EmailSenderForm = {
	apiKey: string;
	fromEmail: string;
	fromName: string;
	replyTo: string;
};

export type EmailSenderState = {
	customDomain: string | null;
	sender: CompanySenderStatus | null;
};

export type UseEmailSenderReturn = {
	loading: boolean;
	saving: boolean;
	error: string | null;
	ok: string | null;
	status: EmailSenderState | null;
	save: (form: EmailSenderForm) => Promise<boolean>;
	remove: () => Promise<boolean>;
	reload: () => Promise<void>;
};

/** Resend propio para los cupones por correo (pestaña Correo de cupones). */
export function useEmailSender(enabled: boolean): UseEmailSenderReturn {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [status, setStatus] = useState<EmailSenderState | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(ENDPOINT, { cache: "no-store" });
			const data = (await res.json().catch(() => ({}))) as Partial<EmailSenderState> & { error?: string };
			if (!res.ok) {
				setError(data.error || "No se pudo cargar el correo de los cupones.");
				return;
			}
			setStatus({ customDomain: data.customDomain ?? null, sender: data.sender ?? null });
		} catch {
			setError("No se pudo cargar el correo de los cupones.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!enabled) return;
		void reload();
	}, [enabled, reload]);

	const save = useCallback(async (form: EmailSenderForm) => {
		setSaving(true);
		setError(null);
		setOk(null);
		try {
			const res = await fetch(ENDPOINT, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const data = (await res.json().catch(() => ({}))) as {
				sender?: CompanySenderStatus | null;
				testSentTo?: string;
				error?: string;
			};
			if (!res.ok) {
				setError(data.error || "No se pudo guardar.");
				return false;
			}
			setStatus((prev) => ({ customDomain: prev?.customDomain ?? null, sender: data.sender ?? null }));
			setOk(`Listo. Te mandamos un correo de prueba a ${data.testSentTo ?? "tu correo"}.`);
			return true;
		} catch {
			setError("No se pudo guardar.");
			return false;
		} finally {
			setSaving(false);
		}
	}, []);

	const remove = useCallback(async () => {
		setSaving(true);
		setError(null);
		setOk(null);
		try {
			const res = await fetch(ENDPOINT, { method: "DELETE" });
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				setError(data.error || "No se pudo quitar.");
				return false;
			}
			setStatus((prev) => ({ customDomain: prev?.customDomain ?? null, sender: null }));
			setOk("Quitado. Tus cupones vuelven a salir desde GodCode con el nombre de tu negocio.");
			return true;
		} catch {
			setError("No se pudo quitar.");
			return false;
		} finally {
			setSaving(false);
		}
	}, []);

	return { loading, saving, error, ok, status, save, remove, reload };
}
