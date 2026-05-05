import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fetchOnboardingFunnelCounts } from "@/lib/super-admin/super-admin-metrics";

export const dynamic = "force-dynamic";

const ORDER = [
	"pending_verification",
	"email_verified",
	"form_completed",
	"payment_pending",
	"active",
	"rejected",
] as const;

const LABELS: Record<string, string> = {
	pending_verification: "Pendiente verificación de correo",
	email_verified: "Correo verificado",
	form_completed: "Formulario de negocio completo",
	payment_pending: "Esperando pago de suscripción",
	active: "Onboarding completado (activo)",
	rejected: "Rechazado",
};

export default async function OnboardingEmbudoPage() {
	const funnel = await fetchOnboardingFunnelCounts();
	const total = funnel.total || 1;

	return (
		<div className="min-w-0 space-y-6">
			<div>
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
				>
					<ArrowLeft className="h-3.5 w-3.5" /> Volver al dashboard
				</Link>
				<h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Embudo de onboarding</h2>
				<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
					Distribución por <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">onboarding_applications.status</code>.
					Usá esto para ver en qué paso se estanca el registro.
				</p>
			</div>

			{funnel.error ? (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
					{funnel.error}
				</div>
			) : null}

			<div className="space-y-4">
				{ORDER.map((key) => {
					const count = funnel.counts[key] ?? 0;
					const pct = Math.round((1000 * count) / total) / 10;
					const progressValue = Math.max(0, Math.min(1000, Math.round((count / total) * 1000)));
					return (
						<div key={key}>
							<div className="mb-1 flex justify-between text-sm">
								<span className="font-medium text-zinc-800 dark:text-zinc-200">{LABELS[key] ?? key}</span>
								<span className="tabular-nums text-zinc-600 dark:text-zinc-400">
									{count} ({pct}% del total)
								</span>
							</div>
							<progress
								className="h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-zinc-100 [&::-webkit-progress-value]:bg-indigo-500 [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:bg-indigo-500 dark:[&::-webkit-progress-bar]:bg-zinc-800 dark:[&::-webkit-progress-value]:bg-indigo-600 dark:[&::-moz-progress-bar]:bg-indigo-600"
								max={1000}
								value={progressValue}
								aria-label={`${LABELS[key] ?? key}: ${pct}%`}
							/>
						</div>
					);
				})}
			</div>

			<p className="text-xs text-zinc-500 dark:text-zinc-400">
				Para reducir abandono: revisá correo (SPF/DKIM), claridad del paso 2 y redirección post-pago (Stripe).
				Listado operativo en{" "}
				<Link href="/onboarding/solicitudes" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
					Solicitudes
				</Link>
				.
			</p>
		</div>
	);
}
