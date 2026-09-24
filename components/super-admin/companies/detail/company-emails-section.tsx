import Link from "next/link";

import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import type { DeliveryRow } from "@/lib/email/deliveries";
import { EMAIL_CATALOG } from "@/lib/email/templates";
import type { StatusTone } from "@/lib/status/status-labels";
import { formatAdminDateTime } from "@/lib/super-admin/admin-format";

const LABELS = new Map<string, string>(EMAIL_CATALOG.map((entry) => [entry.kind, entry.label]));

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
	sent: { label: "Enviado", tone: "success" },
	sending: { label: "Enviando", tone: "info" },
	failed: { label: "Falló", tone: "danger" },
	skipped: { label: "Omitido", tone: "neutral" },
};

/** Últimos correos al negocio: para contestar «¿le llegó el aviso?» sin abrir Resend. */
export function CompanyEmailsSection({ deliveries }: { deliveries: DeliveryRow[] | null }) {
	return (
		<section className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Correos enviados</h2>
				<Link href="/herramientas/correos" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100">
					Ver plantillas y envíos
				</Link>
			</div>
			{deliveries === null ? (
				<p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">El historial aparece cuando se corre la migración del registro de envíos.</p>
			) : deliveries.length === 0 ? (
				<p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay correos registrados para este negocio.</p>
			) : (
				<ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
					{deliveries.map((row) => {
						const status = STATUS[row.status] ?? { label: row.status, tone: "neutral" as const };
						return (
							<li key={row.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
								<div className="min-w-0">
									<p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{LABELS.get(row.kind) ?? row.kind}</p>
									<p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
										{row.subject} · {row.recipient}
									</p>
									{row.error ? <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{row.error}</p> : null}
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<span className="text-xs text-zinc-500 dark:text-zinc-400">{formatAdminDateTime(row.sent_at ?? row.created_at)}</span>
									<SaasStatusBadge label={status.label} variant={status.tone} />
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
