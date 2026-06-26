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

import { formatUsd } from "@/lib/super-admin/format-utils";

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
};

const typeOptions = [
	{ value: "one_time", label: "Pago único" },
	{ value: "monthly", label: "Mensual" },
];

export default function AddonsPage() {
	const [addons, setAddons] = useState<Addon[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showNew, setShowNew] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [listRef] = useAutoAnimate<HTMLDivElement>();
	const [saving, setSaving] = useState(false);
	const [query, setQuery] = useState("");
	const [form, setForm] = useState({
		slug: "",
		name: "",
		description: "",
		price_one_time: "" as string | number,
		price_monthly: "" as string | number,
		type: "monthly" as "one_time" | "monthly",
		is_active: true,
		sort_order: 0,
	});

	const load = () => {
		setLoading(true);
		fetch("/api/super-admin/addons")
			.then((res) => res.json())
			.then((json: { data?: Addon[] }) => setAddons(json.data ?? []))
			.catch(() => setError("Error al cargar"))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		load();
	}, []);

	const resetForm = () => {
		setForm({
			slug: "",
			name: "",
			description: "",
			price_one_time: "",
			price_monthly: "",
			type: "monthly",
			is_active: true,
			sort_order: addons.length,
		});
		setShowNew(false);
		setEditingId(null);
		setError(null);
	};

	const startNew = () => {
		resetForm();
		setForm((f) => ({ ...f, sort_order: addons.length }));
		setShowNew(true);
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
		});
		setEditingId(a.id);
		setShowNew(false);
	};

	const saveNew = async () => {
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/super-admin/addons", {
				method: "POST",
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
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? "Error al crear");
			load();
			resetForm();
			toast.success("Add-on creado con éxito.");
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : "Error al crear";
			setError(errMsg);
			toast.error(errMsg);
		} finally {
			setSaving(false);
		}
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
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? "Error al guardar");
			load();
			resetForm();
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
				(a.description ?? "").toLowerCase().includes(q),
		);
	}, [addons, query]);

	if (loading) {
		return (
			<div className="flex min-h-[200px] flex-col gap-4">
				<div className="h-24 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
				<div className="grid gap-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="h-28 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-col gap-5 sm:gap-6">
			<SaasPageHeader
				title="Servicios extra"
				description="Add-ons opcionales que los clientes pueden contratar durante el registro."
				icon={Puzzle}
				action={
					<Button type="button" onClick={startNew} disabled={showNew}>
						Nuevo add-on
					</Button>
				}
			/>

			<SaasFilterBar>
				<SaasSearchInput
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Buscar por slug, nombre o descripción…"
					className="min-w-[260px]"
				/>
				<span className="text-xs text-zinc-500">{filteredAddons.length} add-ons</span>
			</SaasFilterBar>

			<Drawer
				open={!!(showNew || editingId)}
				onOpenChange={(open: boolean) => {
					if (!open) resetForm();
				}}
				contentClassName="max-w-xl"
				title={editingId ? "Editar add-on" : "Nuevo add-on"}
				description="Configura slug, nombre, precio y visibilidad del add-on."
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
								onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
								placeholder="custom_domain"
								className="h-10 rounded-xl"
								disabled={!!editingId}
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
					<SaasSwitch
						label="Activo (visible en registro)"
						description="Los add-ons inactivos no aparecen durante el onboarding."
						checked={form.is_active}
						onChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
					/>
					<div className="flex gap-2 pb-2">
						<Button
							type="button"
							onClick={editingId ? saveEdit : saveNew}
							disabled={saving || !form.slug || !form.name}
						>
							{saving ? "Guardando…" : editingId ? "Guardar" : "Crear"}
						</Button>
						<Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
							Cancelar
						</Button>
					</div>
				</div>
			</Drawer>

			{filteredAddons.length === 0 && !showNew ? (
				<SaasEmptyState
					icon={Puzzle}
					title={query ? "Sin resultados" : "No hay add-ons"}
					description={
						query
							? "Ningún add-on coincide con tu búsqueda."
							: "Crea tu primer add-on, por ejemplo dominio propio o personalización de marca."
					}
					action={
						!query && (
							<Button type="button" onClick={startNew}>
								Nuevo add-on
							</Button>
						)
					}
				/>
			) : (
				<div ref={listRef} className="grid gap-4">
					{filteredAddons.map((a) => (
					<Card key={a.id} className="rounded-3xl border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-5">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-medium text-zinc-900 dark:text-zinc-100">{a.name ?? a.slug}</p>
										<SaasStatusBadge label={a.is_active ? "Activo" : "Inactivo"} variant={a.is_active ? "success" : "neutral"} />
								</div>
								<p className="mt-0.5 text-xs text-zinc-500">{a.slug}</p>
								{a.description ? (
									<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{a.description}</p>
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
