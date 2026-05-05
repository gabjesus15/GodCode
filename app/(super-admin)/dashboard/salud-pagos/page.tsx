import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fetchPaymentHealthRows } from "@/lib/super-admin/super-admin-metrics";

export const dynamic = "force-dynamic";

export default async function SaludPagosPage() {
	const { rows, error } = await fetchPaymentHealthRows(60);

	return (
		<div className="min-w-0 space-y-6">
			<div>
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
				>
					<ArrowLeft className="h-3.5 w-3.5" /> Volver al dashboard
				</Link>
				<h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Salud de pagos</h2>
				<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
					Heurísticas para detectar desalineación entre estado de suscripción y último pago registrado.
					Las empresas en trial o activación manual pueden aparecer como falsos positivos.
				</p>
			</div>

			{error ? (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
					{error}
				</div>
			) : null}

			<div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
				<table className="min-w-full text-left text-sm">
					<thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
						<tr>
							<th className="px-4 py-3">Tipo</th>
							<th className="px-4 py-3">Empresa</th>
							<th className="px-4 py-3">Estado suscripción</th>
							<th className="px-4 py-3">Último pago</th>
							<th className="px-4 py-3">Fecha</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
						{rows.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
									No se detectaron alertas con los criterios actuales.
								</td>
							</tr>
						) : (
							rows.map((r) => (
								<tr key={`${r.type}-${r.company_id}`} className="text-zinc-800 dark:text-zinc-200">
									<td className="px-4 py-3">
										{r.type === "active_without_paid_payment" ? (
											<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
												Activa sin pago pagado
											</span>
										) : (
											<span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100">
												Suspendida con pago reciente
											</span>
										)}
									</td>
									<td className="px-4 py-3 font-medium">{r.company_name}</td>
									<td className="px-4 py-3">{r.subscription_status ?? "—"}</td>
									<td className="px-4 py-3">{r.last_payment_status ?? "—"}</td>
									<td className="px-4 py-3 tabular-nums text-zinc-600 dark:text-zinc-400">
										{r.last_payment_date
											? new Date(r.last_payment_date).toLocaleDateString("es-CL")
											: "—"}
									</td>
									<td className="px-4 py-3">
										<Link
											href={`/companies/${r.company_id}`}
											className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
										>
											Ver empresa
										</Link>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
