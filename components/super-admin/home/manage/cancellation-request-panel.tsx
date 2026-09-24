"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw, UserMinus } from "lucide-react";

import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

type Props = {
	companyId: string;
	requestedAt: string;
	onlineUntil: string;
	reason: string | null;
	/** Simulación: se ve igual, pero los botones no hacen nada. */
	demo?: boolean;
};

async function setStatus(companyId: string, status: "active" | "suspended"): Promise<string | null> {
	try {
		const res = await fetch(`/api/super-admin/companies/${companyId}/subscription`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "set_status", status }),
		});
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		return res.ok ? null : (data.error ?? "No se pudo cambiar el estado.");
	} catch {
		return "No pudimos conectar. Revisa tu conexión.";
	}
}

/**
 * Solicitud de baja del dueño: cuándo la pidió, hasta cuándo sigue online y por qué. Se puede
 * revertir (vuelve a activa) o adelantar (suspender ya). Pasa por el mismo endpoint que el resto
 * de cambios de estado, que valida y deja auditoría.
 */
export function CancellationRequestPanel({ companyId, requestedAt, onlineUntil, reason, demo = false }: Props) {
	const router = useRouter();
	const { readOnly } = useAdminRole();
	const [busy, setBusy] = useState<"active" | "suspended" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const canAct = !readOnly && !demo;

	const run = async (status: "active" | "suspended") => {
		if (
			status === "suspended" &&
			!window.confirm("¿Suspender la tienda ahora? Queda fuera de línea hoy, sin esperar el vencimiento.")
		) {
			return;
		}
		setBusy(status);
		setError(null);
		const err = await setStatus(companyId, status);
		setBusy(null);
		if (err) setError(err);
		else router.refresh();
	};

	return (
		<section className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900/60 dark:bg-zinc-900 sm:p-5">
			<div className="flex items-center gap-2">
				<UserMinus className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
				<h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Solicitud de baja</h3>
				{demo ? <span className="text-xs text-zinc-400">· simulación</span> : null}
			</div>
			<dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-zinc-500 dark:text-zinc-400">La pidió</dt>
					<dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">{requestedAt}</dd>
				</div>
				<div>
					<dt className="text-xs text-zinc-500 dark:text-zinc-400">Sigue online hasta</dt>
					<dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">{onlineUntil}</dd>
				</div>
				<div className="sm:col-span-2">
					<dt className="text-xs text-zinc-500 dark:text-zinc-400">Motivo</dt>
					<dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">{reason ?? "No dejó motivo."}</dd>
				</div>
			</dl>
			{error ? (
				<p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
					{error}
				</p>
			) : null}
			{readOnly ? null : (
				<div className="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void run("active")}
						disabled={!canAct || busy != null}
						className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
					>
						<RotateCcw className="h-4 w-4" aria-hidden />
						{busy === "active" ? "Revirtiendo…" : "Revertir baja"}
					</button>
					<button
						type="button"
						onClick={() => void run("suspended")}
						disabled={!canAct || busy != null}
						className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
					>
						<Ban className="h-4 w-4" aria-hidden />
						{busy === "suspended" ? "Suspendiendo…" : "Suspender ahora"}
					</button>
				</div>
			)}
			<p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
				Revertir la deja activa hasta el mismo vencimiento. Si no haces nada, la tienda se apaga sola al vencer.
			</p>
		</section>
	);
}

/** En el pie de la ventana: con baja pedida, "Suspender" apagaba la tienda en vez de revertir. */
export function RevertCancellationButton({ companyId, demo = false }: { companyId: string; demo?: boolean }) {
	const router = useRouter();
	const { readOnly } = useAdminRole();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	if (readOnly) return null;
	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				disabled={demo || busy}
				onClick={async () => {
					setBusy(true);
					setError(null);
					const err = await setStatus(companyId, "active");
					setBusy(false);
					if (err) setError(err);
					else router.refresh();
				}}
				className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
			>
				<RotateCcw className="h-4 w-4" aria-hidden />
				{busy ? "Revirtiendo…" : "Revertir baja"}
			</button>
			{error ? <span className="text-xs text-red-600 dark:text-red-400">{error}</span> : null}
		</div>
	);
}
