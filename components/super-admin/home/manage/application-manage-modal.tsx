"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ClipboardList, ExternalLink, Trash2, X } from "lucide-react";

import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { maskEmail } from "@/lib/privacy/mask-contact";
import { demoApplication, DEMO_APPLICATION_ID } from "@/lib/super-admin/home-demo";
import type { OnboardingApplicationRow } from "@/lib/super-admin/onboarding-application-types";
import { onboardingStatus, paymentStatus } from "@/lib/super-admin/status-maps";

import { RowAlertBanner } from "../row-alert-banner";
import { CompanyManageModal, CompanyManageModalSkeleton } from "./company-manage-modal";

const dayFmt = new Intl.DateTimeFormat("es-CL", {
	day: "numeric",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	timeZone: "America/Santiago",
});
const fmt = (iso: string | null | undefined) => (iso ? dayFmt.format(new Date(iso)).replace(/\./g, "") : "—");

/** Mismo listado que usa la página Solicitudes de alta (hasta 200, las más nuevas primero). */
function useOnboardingApplications(enabled = true) {
	return useQuery({
		queryKey: ["admin", "solicitudes", "list"],
		enabled,
		queryFn: async () => {
			const res = await fetch("/api/super-admin/solicitudes", { cache: "no-store" });
			const json = (await res.json().catch(() => ({}))) as { data?: OnboardingApplicationRow[]; error?: string };
			if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar las solicitudes");
			return json.data ?? [];
		},
	});
}

/**
 * Datos, pago (aceptar o rechazar el comprobante), agenda de entrega y eliminar. Se usa en la
 * ventana de la solicitud y en la pestaña "Solicitud de alta" de cada empresa.
 */
function ApplicationPanels({
	app,
	demo,
	onDeleted,
	onChanged,
}: {
	app: OnboardingApplicationRow;
	demo: boolean;
	onDeleted: () => Promise<unknown> | void;
	onChanged: () => Promise<unknown> | void;
}) {
	const { readOnly } = useAdminRole();
	const [busy, setBusy] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const payment = paymentStatus(app.payment_status);
	const reference = app.last_payment?.payment_reference ?? "";
	const canReviewPayment = app.payment_status === "pending_validation" && Boolean(reference);
	const canAct = !readOnly && !demo;

	const run = async (key: string, request: () => Promise<Response>, after: () => Promise<unknown> | void) => {
		setBusy(key);
		setActionError(null);
		try {
			const res = await request();
			const json = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(json.error ?? "No se pudo completar la acción");
			await after();
		} catch (err) {
			setActionError(err instanceof Error ? err.message : "No se pudo completar la acción");
		} finally {
			setBusy(null);
		}
	};

	const post = (url: string, body: Record<string, unknown>) => () =>
		fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

	const validate = () => void run("validate", post("/api/super-admin/payments/validate", { payment_reference: reference }), onChanged);

	const reject = () => {
		const reason = window.prompt("¿Por qué rechazas el pago? El cliente verá este motivo.");
		if (reason == null) return;
		void run("reject", post("/api/super-admin/payments/reject", { payment_reference: reference, reason }), onChanged);
	};

	const remove = () => {
		if (!window.confirm("¿Eliminar esta solicitud? Esta acción no se puede deshacer.")) return;
		void run(
			"delete",
			() =>
				fetch("/api/super-admin/solicitudes/delete", {
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ id: app.id }),
				}),
			onDeleted,
		);
	};

	return (
		<div className="flex flex-col gap-4">
			{demo ? (
				<RowAlertBanner
					alert={{ kind: "application", title: "Simulación", detail: "Datos de ejemplo: los botones no hacen cambios." }}
				/>
			) : null}
			{actionError ? (
				<p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
					{actionError}
				</p>
			) : null}

			<Panel title="Datos del negocio">
				<Facts
					items={[
						["Negocio", app.business_name ?? "—"],
						["Responsable", app.responsible_name ?? "—"],
						["Correo", maskEmail(app.email) ?? "—"],
						["Estado de la solicitud", onboardingStatus(app.status).label],
						["Razón social", app.legal_name ?? "—"],
						["Dirección fiscal", app.fiscal_address ?? "—"],
						["País / moneda", `${app.country ?? "—"} · ${app.currency ?? "—"}`],
						["Dominio", app.custom_domain_value ?? app.custom_domain ?? "—"],
						["Plan", app.plan_price != null ? `${app.plan_label} · US$${app.plan_price}/mes` : app.plan_label || "—"],
						["Llegó", fmt(app.created_at)],
					]}
				/>
			</Panel>

			<Panel title="Pago y comprobante">
				<Facts
					items={[
						["Estado", payment.label],
						["Método", app.subscription_payment_method?.replace(/_/g, " ") ?? "—"],
						["Referencia", reference || "—"],
						["Monto", app.last_payment ? `US$${app.last_payment.amount_paid}` : "—"],
						["Fecha de pago", fmt(app.last_payment?.payment_date)],
					]}
				/>
				<div className="mt-4 flex flex-wrap gap-2">
					{app.last_payment?.reference_file_url ? (
						<a
							href={app.last_payment.reference_file_url}
							target="_blank"
							rel="noreferrer noopener"
							className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
						>
							<ExternalLink className="h-4 w-4" aria-hidden />
							Ver comprobante
						</a>
					) : null}
					{canReviewPayment && !readOnly ? (
						<>
							<button
								type="button"
								onClick={validate}
								disabled={!canAct || busy != null}
								className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
							>
								<Check className="h-4 w-4" aria-hidden />
								{busy === "validate" ? "Validando…" : "Aceptar pago"}
							</button>
							<button
								type="button"
								onClick={reject}
								disabled={!canAct || busy != null}
								className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
							>
								<X className="h-4 w-4" aria-hidden />
								{busy === "reject" ? "Rechazando…" : "Rechazar"}
							</button>
						</>
					) : null}
				</div>
				{!canReviewPayment ? (
					<p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">No hay un comprobante esperando validación.</p>
				) : null}
			</Panel>

			<Panel title="Agenda de entrega">
				<Facts
					items={[
						["Fecha agendada", app.delivery_booking?.scheduled_for ? fmt(app.delivery_booking.scheduled_for) : "Sin agenda"],
						["Asignado a", app.delivery_booking?.assigned_to ?? "Pendiente de asignar"],
						["Estado interno", app.delivery_booking?.status ?? "—"],
					]}
				/>
			</Panel>

			<div className="flex flex-wrap items-center justify-end gap-2">
				{readOnly ? null : (
					<button
						type="button"
						onClick={remove}
						disabled={!canAct || !app.can_delete || busy != null}
						title={app.can_delete ? undefined : (app.delete_block_reason ?? "Esta solicitud no se puede eliminar")}
						className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
					>
						<Trash2 className="h-4 w-4" aria-hidden />
						{busy === "delete" ? "Eliminando…" : "Eliminar solicitud"}
					</button>
				)}
			</div>
		</div>
	);
}

/** Ventana propia de una solicitud (las que todavía no son empresa). */
export function ApplicationManageModal({ id, closeHref, demo = false }: { id: string; closeHref: string; demo?: boolean }) {
	const router = useRouter();
	const isDemo = demo && id === DEMO_APPLICATION_ID;
	const { data, isLoading, error, refetch } = useOnboardingApplications(!isDemo);

	if (!isDemo && isLoading) return <CompanyManageModalSkeleton />;

	const app = isDemo ? demoApplication() : (data?.find((row) => row.id === id) ?? null);

	if (!app) {
		return (
			<CompanyManageModal
				closeHref={closeHref}
				header={{
					id,
					name: error ? "No se pudo cargar" : "Solicitud no encontrada",
					host: "",
					publicSlug: null,
					logoUrl: null,
					status: { label: "Sin datos", variant: "neutral" },
					menuUrl: "",
					panelUrl: "",
					facts: [],
				}}
				tabs={[
					{
						id: "solicitud",
						label: "Solicitud",
						content: (
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								{error ? "Recarga la página en unos segundos." : "Puede que ya la hayan procesado o eliminado."}
							</p>
						),
					},
				]}
			/>
		);
	}

	return (
		<CompanyManageModal
			closeHref={closeHref}
			header={{
				id: app.id,
				name: app.business_name?.trim() || "Sin nombre",
				host: [app.responsible_name, maskEmail(app.email)].filter(Boolean).join(" · "),
				publicSlug: null,
				logoUrl: null,
				status: onboardingStatus(app.status),
				menuUrl: "",
				panelUrl: "",
				facts: [
					{ label: "Plan", value: app.plan_label || "Sin plan", hint: app.plan_price != null ? `US$${app.plan_price}/mes` : undefined },
					{ label: "Pago", value: paymentStatus(app.payment_status).label },
					{ label: "Llegó", value: fmt(app.created_at) },
					{ label: "País / moneda", value: `${app.country ?? "—"} · ${app.currency ?? "—"}` },
				],
			}}
			tabs={[
				{
					id: "solicitud",
					label: "Solicitud",
					content: (
						<ApplicationPanels
							app={app}
							demo={isDemo}
							onDeleted={() => {
								router.push(closeHref, { scroll: false });
								router.refresh();
							}}
							onChanged={async () => {
								await refetch();
								router.refresh();
							}}
						/>
					),
				},
			]}
		/>
	);
}

/** Pestaña "Solicitud de alta" dentro de la gestión de una empresa. */
export function CompanyApplicationTab({ companyId, demo = false }: { companyId: string; demo?: boolean }) {
	const router = useRouter();
	const { data, isLoading, error, refetch } = useOnboardingApplications(!demo);

	if (demo) {
		return <ApplicationPanels app={{ ...demoApplication(), company_id: companyId }} demo onDeleted={() => {}} onChanged={() => {}} />;
	}
	if (isLoading) {
		return <div className="h-40 animate-pulse rounded-xl bg-white dark:bg-zinc-900" aria-label="Cargando solicitud" />;
	}
	if (error) {
		return <p className="text-sm text-red-600 dark:text-red-400">No se pudo cargar la solicitud de alta. Recarga en unos segundos.</p>;
	}

	// La más reciente de esta empresa (el listado viene de más nueva a más antigua).
	const app = data?.find((row) => row.company_id === companyId) ?? null;
	if (!app) {
		return (
			<section className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
				<ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
				<div>
					<h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Solicitud de alta</h3>
					<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
						No tiene: la empresa se creó desde el panel, sin pasar por el registro en línea (o su solicitud ya no está entre las
						últimas 200).
					</p>
				</div>
			</section>
		);
	}

	const refresh = async () => {
		await refetch();
		router.refresh();
	};
	return <ApplicationPanels app={app} demo={false} onDeleted={refresh} onChanged={refresh} />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
			<h3 className="mb-4 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
			{children}
		</section>
	);
}

function Facts({ items }: { items: Array<[string, string]> }) {
	return (
		<dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
			{items.map(([label, value]) => (
				<div key={label} className="min-w-0">
					<dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
					<dd className="mt-0.5 break-words text-sm text-zinc-900 dark:text-zinc-100">{value}</dd>
				</div>
			))}
		</dl>
	);
}
