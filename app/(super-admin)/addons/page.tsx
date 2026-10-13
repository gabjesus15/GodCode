"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card } from "@/components/ui/card";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Drawer } from "@/components/ui/drawer";
import { toast } from "sonner";
import { Puzzle } from "lucide-react";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { SaasFilterBar, SaasSearchInput } from "@/components/super-admin/shared/saas-filter-bar";

import { formatUsd } from "@/lib/billing/portal-pricing";
import { TENANT_ADMIN_TAB_OPTIONS } from "@/lib/super-admin/tenant-admin-tabs";

const TAB_LABELS = new Map<string, string>(TENANT_ADMIN_TAB_OPTIONS.map((tab) => [tab.id, tab.label]));

type Addon = {
	id: string;
	slug: string;
	name: string | null;
	description: string | null;
	price_one_time: number | null;
	price_monthly: number | null;
	type: string;
	is_active: boolean;
	sort_order: number;
	unlocks_tabs: string[] | null;
	panel_module: string | null;
	company_id: string | null;
	company?: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
};

/** Extra que existe en el panel de caja (`GodCode-Panel/src/addons/`) y todavía no se publicó. */
type PanelModule = { id: string; label: string; description: string | null };

type CatalogResponse = {
	data?: Addon[];
	panelModules?: PanelModule[];
	panelModuleIds?: string[] | null;
	panelError?: string | null;
};

const scopeOptions = [
	{ value: "public", label: "Para todos" },
	{ value: "private", label: "A medida (de una empresa)" },
];

const companyName = (a: Addon) => {
	const company = Array.isArray(a.company) ? a.company[0] : a.company;
	return company?.name ?? null;
};

const typeOptions = [
	{ value: "one_time", label: "Pago único" },
	{ value: "monthly", label: "Mensual" },
];

export default function AddonsPage() {
	const [addons, setAddons] = useState<Addon[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [publishing, setPublishing] = useState<PanelModule | null>(null);
	const [panelModules, setPanelModules] = useState<PanelModule[]>([]);
	const [panelModuleIds, setPanelModuleIds] = useState<string[] | null>(null);
	const [panelError, setPanelError] = useState<string | null>(null);
	const [listRef] = useAutoAnimate<HTMLDivElement>();
	const [saving, setSaving] = useState(false);
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<"public" | "private">("public");
	const [form, setForm] = useState({
		slug: "",
		name: "",
		description: "",
		price_one_time: "" as string | number,
		price_monthly: "" as string | number,
		type: "monthly" as "one_time" | "monthly",
		is_active: true,
		sort_order: 0,
		unlocks_tabs: [] as string[],
		panel_module: "",
		company_name: "",
	});

	const load =(nextScope: "public" | "private" = scope) => {
		setLoading(true);
		fetch(`/api/super-admin/addons${nextScope === "private" ? "?scope=private" : ""}`)
			.then((res) => res.json())
			.then((json: CatalogResponse) => {
				setAddons(json.data ?? []);
				setPanelModules(json.panelModules ?? []);
				setPanelModuleIds(json.panelModuleIds ?? null);
				setPanelError(json.panelError ?? null);
			})
			.catch(() => setError("Error al cargar"))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		load(scope);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [scope]);

	const closeEdit = () => {
		setEditingId(null);
		setPublishing(null);
		setError(null);
	};

	/** Abre el editor con los datos del panel para ponerle precio y publicarlo. */
	const startPublish = (item: PanelModule) => {
		setForm({
			slug: `panel_${item.id.replace(/-/g, "_")}`,
			name: item.label,
			description: item.description ?? "",
			price_one_time: "",
			price_monthly: "",
			type: "monthly",
			is_active: false,
			sort_order: addons.length,
			unlocks_tabs: [],
			panel_module: item.id,
			company_name: "",
		});
		setError(null);
		setEditingId(null);
		setPublishing(item);
	};

	const savePublish = async () => {
		if (!publishing) return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/super-admin/addons", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					panel_module: publishing.id,
					name: form.name,
					description: form.description,
					price_one_time: form.price_one_time === "" ? null : Number(form.price_one_time),
					price_monthly: form.price_monthly === "" ? null : Number(form.price_monthly),
					type: form.type,
					is_active: form.is_active,
					sort_order: form.sort_order,
					unlocks_tabs: form.unlocks_tabs,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? "Error al publicar");
			load();
			closeEdit();
			toast.success("Extra publicado en el catálogo.");
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : "Error al publicar";
			setError(errMsg);
			toast.error(errMsg);
		} finally {
			setSaving(false);
		}
	};

	const startEdit = (a: Addon) => {
		setForm({
			slug: a.slug,
			name: a.name ?? "",
			description: a.description ?? "",
			price_one_time: a.price_one_time ?? "",
			price_monthly: a.price_monthly ?? "",
			type: (a.type === "monthly" ? "monthly" : "one_time") as "one_time" | "monthly",
			is_active: a.is_active,
			sort_order: a.sort_order,
			unlocks_tabs: a.unlocks_tabs ?? [],
			panel_module: a.panel_module ?? "",
			company_name: companyName(a) ?? "",
		});
		setError(null);
		setPublishing(null);
		setEditingId(a.id);
	};

	const saveEdit = async () => {
		if (!editingId) return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`/api/super-admin/addons/${editingId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					slug: form.slug,
					name: form.name,
					description: form.description || undefined,
					price_one_time: form.price_one_time === "" ? null : Number(form.price_one_time),
					price_monthly: form.price_monthly === "" ? null : Number(form.price_monthly),
					type: form.type,
					is_active: form.is_active,
					sort_order: form.sort_order,
					unlocks_tabs: form.unlocks_tabs,
					panel_module: form.panel_module.trim() || null,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? "Error al guardar");
			load();
			closeEdit();
			toast.success("Add-on guardado con éxito.");
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : "Error al guardar";
			setError(errMsg);
			toast.error(errMsg);
		} finally {
			setSaving(false);
		}
	};

	const filteredAddons = useMemo(() => {
		if (!query.trim()) return addons;
		const q = query.toLowerCase();
		return addons.filter(
			(a) =>
				a.slug.toLowerCase().includes(q) ||
				(a.name ?? "").toLowerCase().includes(q) ||
				(a.description ?? "").toLowerCase().includes(q) ||
				(a.panel_module ?? "").toLowerCase().includes(q) ||
				(companyName(a) ?? "").toLowerCase().includes(q),
		);
	}, [addons, query]);

	const filteredPanelModules = useMemo(() => {
		if (!query.trim()) return panelModules;
		const q = query.toLowerCase();
		return panelModules.filter(
			(m) => m.id.includes(q) || m.label.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q),
		);
	}, [panelModules, query]);

	if (loading) {
		return (
			<div className="flex min-h-[200px] flex-col gap-4">
				<div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
				<div className="grid gap-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-col gap-5 sm:gap-6">
			<SaasPageHeader
				title="Servicios extra"
				description="Servicios que los negocios pueden sumar a su plan, al registrarse o desde /cuenta. Los extras que se programan en el panel de caja aparecen aquí para publicarlos con su precio."
			/>

			<SaasFilterBar>
				<SaasSearchInput
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Buscar por slug, nombre o descripción…"
					className="min-w-[260px]"
				/>
				<SaasSelect options={scopeOptions} value={scope} onChange={(value) => setScope(value === "private" ? "private" : "public")} className="max-w-[240px]" />
				<span className="text-xs text-zinc-500">{filteredAddons.length} add-ons</span>
			</SaasFilterBar>

			<Drawer
				open={!!(editingId || publishing)}
				onOpenChange={(open: boolean) => {
					if (!open) closeEdit();
				}}
				contentClassName="max-w-xl"
				title={publishing ? "Publicar extra del panel" : "Editar servicio extra"}
				description={
					publishing
						? "Ponle nombre y precio. Queda en el catálogo; prende «Activo» para ofrecerlo en el registro y en /cuenta."
						: "Nombre, precio y si se ofrece o no."
				}
			>
				<div className="space-y-5 py-2">
					{error && (
						<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
							{error}
						</div>
					)}
					<div className="grid gap-4 sm:grid-cols-2">
						<label className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Slug (único)</span>
							<Input
								value={form.slug}
								className="h-10 rounded-xl"
								disabled
							/>
						</label>
						<label className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Nombre</span>
							<Input
								value={form.name}
								onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
								placeholder="Dominio propio"
								className="h-10 rounded-xl"
							/>
						</label>
						<label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Descripción</span>
							<Input
								value={form.description}
								onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
								placeholder="Opcional"
								className="h-10 rounded-xl"
							/>
						</label>
						<SaasSelect
							label="Tipo"
							options={typeOptions}
							value={form.type}
							onChange={(value) => setForm((p) => ({ ...p, type: value as "one_time" | "monthly" }))}
						/>
						<label className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Orden</span>
							<Input
								type="number"
								min={0}
								value={form.sort_order}
								onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))}
								className="h-10 rounded-xl"
							/>
						</label>
						<label className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Precio único (USD)</span>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.price_one_time === "" ? "" : form.price_one_time}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										price_one_time: e.target.value === "" ? "" : Number(e.target.value),
									}))
								}
								placeholder="50"
								className="h-10 rounded-xl"
								disabled={form.type === "monthly"}
							/>
						</label>
						<label className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Precio mensual (USD)</span>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.price_monthly === "" ? "" : form.price_monthly}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										price_monthly: e.target.value === "" ? "" : Number(e.target.value),
									}))
								}
								placeholder="5"
								className="h-10 rounded-xl"
								disabled={form.type === "one_time"}
							/>
						</label>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<label className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Módulo del panel (carpeta)</span>
							<Input
								value={form.panel_module}
								onChange={(e) => setForm((p) => ({ ...p, panel_module: e.target.value.toLowerCase() }))}
								placeholder="cuadre-caja"
								className="h-10 rounded-xl"
								disabled={!!publishing}
							/>
							<span className="text-xs text-zinc-500">
								Carpeta en GodCode-Panel/src/addons/. Vacío = servicio sin pantalla (dominio, diseño…).
							</span>
						</label>
						<div className="flex flex-col gap-1.5 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Solo para una empresa</span>
							<span className="flex h-10 items-center truncate text-zinc-500">{form.company_name || "Para todos"}</span>
							<span className="text-xs text-zinc-500">Un extra a medida solo lo ve y lo compra esa empresa.</span>
						</div>
					</div>
					<fieldset className="space-y-2">
						<legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Desbloquea en el panel</legend>
						<p className="text-xs text-zinc-500">
							Pestañas que el negocio ve mientras el extra esté activo, además de las de su plan.
						</p>
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
												setForm((p) => ({
													...p,
													unlocks_tabs: checked ? p.unlocks_tabs.filter((id) => id !== tab.id) : [...p.unlocks_tabs, tab.id],
												}))
											}
										/>
										{tab.label}
									</label>
								);
							})}
						</div>
					</fieldset>
					<SaasSwitch
						label="Activo (visible en registro)"
						description="Los servicios inactivos no se ofrecen en el registro ni en /cuenta."
						checked={form.is_active}
						onChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
					/>
					<div className="flex gap-2 pb-2">
						<Button type="button" onClick={publishing ? savePublish : saveEdit} disabled={saving || !form.name.trim()}>
							{saving ? "Guardando…" : publishing ? "Publicar" : "Guardar"}
						</Button>
						<Button type="button" variant="outline" onClick={closeEdit} disabled={saving}>
							Cancelar
						</Button>
					</div>
				</div>
			</Drawer>

			{panelError ? (
				<p className="text-xs text-amber-700 dark:text-amber-400">
					{panelError} No se pueden ver los extras del panel que faltan por publicar.
				</p>
			) : null}

			{scope === "public" && filteredPanelModules.length > 0 ? (
				<section className="flex flex-col gap-3">
					<div>
						<h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">En el panel, sin publicar</h2>
						<p className="text-xs text-zinc-500">
							Extras programados en el panel de caja que todavía no están en el catálogo. Publícalos para ponerles precio.
						</p>
					</div>
					{filteredPanelModules.map((item) => (
						<Card
							key={item.id}
							className="rounded-2xl border-dashed border-zinc-300 bg-white p-4 shadow-none dark:border-zinc-700 dark:bg-zinc-900 sm:p-5"
						>
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</p>
										<SaasStatusBadge label="Sin publicar" variant="warning" />
									</div>
									{item.description ? (
										<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>
									) : null}
									<p className="mt-2 text-xs text-zinc-500">Abre en el panel: {item.id}</p>
								</div>
								<Button type="button" size="sm" onClick={() => startPublish(item)}>
									Publicar
								</Button>
							</div>
						</Card>
					))}
				</section>
			) : null}

			{filteredAddons.length === 0 ? (
				<SaasEmptyState
					icon={Puzzle}
					title={query ? "Sin resultados" : "No hay servicios extra"}
					description={
						query
							? "Ningún servicio extra coincide con tu búsqueda."
							: "Programa un extra en GodCode-Panel/src/addons/ y aparecerá aquí para publicarlo."
					}
				/>
			) : (
				<div ref={listRef} className="grid gap-4">
					{filteredAddons.map((a) => (
					<Card key={a.id} className="shadow-none rounded-2xl border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-medium text-zinc-900 dark:text-zinc-100">{a.name ?? a.slug}</p>
										<SaasStatusBadge label={a.is_active ? "Activo" : "Inactivo"} variant={a.is_active ? "success" : "neutral"} />
										{a.panel_module && panelModuleIds && !panelModuleIds.includes(a.panel_module) ? (
											<SaasStatusBadge label="No está en el panel" variant="warning" />
										) : null}
								</div>
								<p className="mt-0.5 text-xs text-zinc-500">{a.slug}</p>
								{a.description ? (
									<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{a.description}</p>
								) : null}
								{a.panel_module || companyName(a) ? (
									<p className="mt-2 text-xs text-zinc-500">
										{[a.panel_module ? `Abre en el panel: ${a.panel_module}` : null, companyName(a) ? `Solo para ${companyName(a)}` : null]
											.filter(Boolean)
											.join(" · ")}
									</p>
								) : null}
								{a.unlocks_tabs && a.unlocks_tabs.length > 0 ? (
									<p className="mt-2 text-xs text-zinc-500">
										Desbloquea: {a.unlocks_tabs.map((id) => TAB_LABELS.get(id) ?? id).join(", ")}
									</p>
								) : null}
							</div>
							<div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
								{a.type === "monthly" && a.price_monthly != null ? (
									<span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
										{formatUsd(Number(a.price_monthly))}/mes
									</span>
								) : null}
								{a.type === "one_time" && a.price_one_time != null ? (
									<span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
										{formatUsd(Number(a.price_one_time))} único
									</span>
								) : null}
								<Button type="button" variant="outline" size="sm" onClick={() => startEdit(a)}>
									Editar
								</Button>
							</div>
						</div>
					</Card>
					))}
				</div>
			)}
		</div>
	);
}
