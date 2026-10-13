"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { SaasFilterBar } from "@/components/super-admin/shared/saas-filter-bar";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import {
	ADDON_REQUEST_STATUS_LABELS,
	ADDON_REQUEST_URGENCIES,
	type AddonRequestRow,
	type AddonRequestStatus,
} from "@/lib/billing/addon-requests";
import { formatUsd } from "@/lib/billing/portal-pricing";
import { formatAdminDateTime } from "@/lib/super-admin/admin-format";
import { TENANT_ADMIN_TAB_OPTIONS } from "@/lib/super-admin/tenant-admin-tabs";
import type { StatusTone } from "@/lib/status/status-labels";

type Relation<T> = T | T[] | null;
type RequestItem = AddonRequestRow & {
	company: Relation<{ id: string; name: string | null; public_slug: string | null }>;
	addon: Relation<{ id: string; unlocks_tabs: string[] | null; panel_module: string | null }>;
};

const one = <T,>(value: Relation<T>): T | null => (Array.isArray(value) ? value[0] ?? null : value);

const STATUS_TONE: Record<AddonRequestStatus, StatusTone> = {
	submitted: "info",
	quoted: "warning",
	accepted: "warning",
	paid: "success",
	delivered: "success",
	rejected: "neutral",
	cancelled: "neutral",
};

const statusFilterOptions = [
	{ value: "", label: "Todos" },
	...(Object.keys(ADDON_REQUEST_STATUS_LABELS) as AddonRequestStatus[]).map((status) => ({
		value: status,
		label: ADDON_REQUEST_STATUS_LABELS[status],
	})),
];

const urgencyLabel = (value: string) => ADDON_REQUEST_URGENCIES.find((u) => u.value === value)?.label ?? value;

type DrawerMode = { kind: "quote" | "deliver"; request: RequestItem } | null;

export default function AddonRequestsPage() {
	const { readOnly } = useAdminRole();
	const [items, setItems] = useState<RequestItem[] | null>(null);
	const [status, setStatus] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<DrawerMode>(null);
	const [form, setForm] = useState({ amount: "", billing: "one_time", note: "", unlocks_tabs: [] as string[], panel_module: "" });
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await fetch(`/api/super-admin/addon-requests${status ? `?status=${status}` : ""}`, { cache: "no-store" });
			const json = (await res.json()) as { data?: RequestItem[]; error?: string };
			if (!res.ok) throw new Error(json.error ?? "Error al cargar");
			setItems(json.data ?? []);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al cargar");
		}
	}, [status]);

	useEffect(() => {
		void load();
	}, [load]);

	const openDrawer = (kind: "quote" | "deliver", request: RequestItem) => {
		setForm({
			amount: request.quote_amount != null ? String(request.quote_amount) : "",
			billing: request.quote_billing === "monthly" ? "monthly" : "one_time",
			note: request.quote_note ?? "",
			unlocks_tabs: one(request.addon)?.unlocks_tabs ?? [],
			panel_module: one(request.addon)?.panel_module ?? "",
		});
		setMode({ kind, request });
	};

	const patch = async (request: RequestItem, body: Record<string, unknown>, success: string) => {
		setSaving(true);
		try {
			const res = await fetch(`/api/super-admin/addon-requests/${request.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const json = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(json.error ?? "No se pudo guardar");
			toast.success(success);
			setMode(null);
			await load();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo guardar");
		} finally {
			setSaving(false);
		}
	};

	const submitDrawer = () => {
		if (!mode) return;
		if (mode.kind === "quote") {
			void patch(
				mode.request,
				{ action: "quote", amount: Number(form.amount), billing: form.billing, note: form.note, unlocks_tabs: form.unlocks_tabs },
				"Cotización enviada: el dueño la ve en /cuenta.",
			);
		} else {
			void patch(
				mode.request,
				{ action: "deliver", unlocks_tabs: form.unlocks_tabs, panel_module: form.panel_module.trim() || null },
				"Pedido entregado: ya aparece en el panel de la empresa.",
			);
		}
	};

	const reject = (request: RequestItem) => {
		if (!window.confirm(`¿Rechazar «${request.title}»? El dueño lo verá como rechazado.`)) return;
		void patch(request, { action: "reject" }, "Pedido rechazado.");
	};

	return (
		<div className="flex min-w-0 flex-col gap-5 sm:gap-6">
			<SaasPageHeader
				title="Pedidos a medida"
				description="Extras que los dueños piden desde /cuenta › Plan y extras. Cotízalos, y al pagarse prepáralos y márcalos entregados."
			/>

			<SaasFilterBar>
				<SaasSelect options={statusFilterOptions} value={status} onChange={setStatus} className="max-w-[220px]" />
				<span className="text-xs text-zinc-500">{items?.length ?? 0} pedidos</span>
			</SaasFilterBar>

			{error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

			{items === null ? (
				<div className="grid gap-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
					))}
				</div>
			) : items.length === 0 ? (
				<SaasEmptyState
					icon={Sparkles}
					title="Sin pedidos"
					description={status ? "No hay pedidos en ese estado." : "Cuando un dueño pida un extra a medida, aparece aquí."}
				/>
			) : (
				<div className="grid gap-4">
					{items.map((request) => {
						const company = one(request.company);
						const requestStatus = (request.status in ADDON_REQUEST_STATUS_LABELS ? request.status : "submitted") as AddonRequestStatus;
						return (
							<Card key={request.id} className="rounded-2xl border-zinc-200 bg-white p-4 shadow-none dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<p className="font-medium text-zinc-900 dark:text-zinc-100">{request.title}</p>
											<SaasStatusBadge label={ADDON_REQUEST_STATUS_LABELS[requestStatus]} variant={STATUS_TONE[requestStatus]} />
										</div>
										<p className="mt-0.5 text-xs text-zinc-500">
											{company?.name ?? "Empresa"} · {request.requested_by_email ?? "sin correo"} · {formatAdminDateTime(request.created_at)} ·{" "}
											{urgencyLabel(request.urgency)}
										</p>
										<p className="mt-2 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">{request.description}</p>
										{request.quote_amount != null ? (
											<p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
												{formatUsd(Number(request.quote_amount))}
												{request.quote_billing === "monthly" ? "/mes" : " pago único"}
												{request.quote_note ? <span className="font-normal text-zinc-500"> · {request.quote_note}</span> : null}
											</p>
										) : null}
									</div>
									{readOnly ? null : (
										<div className="flex shrink-0 flex-wrap gap-2">
											{request.status === "submitted" || request.status === "quoted" ? (
												<>
													<Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => reject(request)}>
														Rechazar
													</Button>
													<Button type="button" size="sm" disabled={saving} onClick={() => openDrawer("quote", request)}>
														{request.status === "quoted" ? "Recotizar" : "Cotizar"}
													</Button>
												</>
											) : null}
											{request.status === "paid" ? (
												<Button type="button" size="sm" disabled={saving} onClick={() => openDrawer("deliver", request)}>
													Marcar entregado
												</Button>
											) : null}
										</div>
									)}
								</div>
							</Card>
						);
					})}
				</div>
			)}

			<Drawer
				open={mode !== null}
				onOpenChange={(open: boolean) => {
					if (!open) setMode(null);
				}}
				contentClassName="max-w-xl"
				title={mode?.kind === "deliver" ? "Marcar entregado" : "Cotizar pedido"}
				description={
					mode?.kind === "deliver"
						? "El dueño lo verá como entregado. Ajusta qué pestañas del panel desbloquea."
						: "Se crea un extra privado para esta empresa. El dueño lo acepta y lo paga desde /cuenta."
				}
			>
				<div className="space-y-5 py-2">
					{mode?.kind === "quote" ? (
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="flex flex-col gap-1.5 text-sm">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">Precio (USD)</span>
								<Input
									type="number"
									step="0.01"
									min="0"
									value={form.amount}
									onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
									className="h-10 rounded-xl"
								/>
							</label>
							<SaasSelect
								label="Cobro"
								options={[
									{ value: "one_time", label: "Pago único" },
									{ value: "monthly", label: "Mensual (se renueva con el plan)" },
								]}
								value={form.billing}
								onChange={(value) => setForm((f) => ({ ...f, billing: value }))}
							/>
							<label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">Nota para el dueño (opcional)</span>
								<textarea
									value={form.note}
									onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
									rows={3}
									maxLength={2000}
									placeholder="Qué incluye, plazo de entrega…"
									className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
								/>
							</label>
						</div>
					) : (
						<label className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Módulo del panel (carpeta)</span>
							<Input
								value={form.panel_module}
								onChange={(e) => setForm((f) => ({ ...f, panel_module: e.target.value.toLowerCase() }))}
								placeholder="cuadre-caja"
								className="h-10 rounded-xl"
							/>
							<span className="text-xs text-zinc-500">
								La carpeta en GodCode-Panel/src/addons/ con la pantalla de este extra. Vacío = no abre pantalla.
							</span>
						</label>
					)}
					<fieldset className="space-y-2">
						<legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Desbloquea en el panel</legend>
						<p className="text-xs text-zinc-500">Pestañas que la empresa ve mientras el extra esté activo. Puede quedar vacío.</p>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{TENANT_ADMIN_TAB_OPTIONS.map((tab) => {
								const checked = form.unlocks_tabs.includes(tab.id);
								return (
									<label key={tab.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
										<input
											type="checkbox"
											className="h-4 w-4 rounded border-zinc-300"
											checked={checked}
											onChange={() =>
												setForm((f) => ({
													...f,
													unlocks_tabs: checked ? f.unlocks_tabs.filter((id) => id !== tab.id) : [...f.unlocks_tabs, tab.id],
												}))
											}
										/>
										{tab.label}
									</label>
								);
							})}
						</div>
					</fieldset>
					<div className="flex gap-2 pb-2">
						<Button type="button" onClick={submitDrawer} disabled={saving || (mode?.kind === "quote" && !(Number(form.amount) > 0))}>
							{saving ? "Guardando…" : mode?.kind === "deliver" ? "Marcar entregado" : "Enviar cotización"}
						</Button>
						<Button type="button" variant="outline" onClick={() => setMode(null)} disabled={saving}>
							Cancelar
						</Button>
					</div>
				</div>
			</Drawer>
		</div>
	);
}
