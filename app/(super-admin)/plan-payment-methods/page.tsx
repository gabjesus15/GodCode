"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "../../../components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";
import { useSaasBreakpoint } from "@/components/super-admin/shared/use-saas-breakpoint";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { ChevronDown, CreditCard, Globe, Pencil, ShieldCheck, UserCheck } from "lucide-react";
import { normalizeCountryCode } from "@/lib/geo/country-registry";
import { cn } from "@/utils/cn";

type Method = {
	id: string;
	slug: string;
	name: string | null;
	countries: string[];
	auto_verify: boolean;
	sort_order: number;
	is_active: boolean;
	config: Record<string, string>;
};

const ONLINE_METHOD_SLUGS = ["paypal"];
/** Métodos que el alta y /cuenta ya ignoran (ver `lib/onboarding/checkout-service`); solo queda apagarlos. */
const RETIRED_METHOD_SLUGS = ["stripe"];

const METHOD_FIELDS: Record<string, { key: string; label: string; placeholder?: string }[]> = {
	pago_movil: [
		{ key: "banco", label: "Banco", placeholder: "Ej: Mercantil, Banesco" },
		{ key: "telefono", label: "Teléfono", placeholder: "Ej: 0412-1234567" },
		{ key: "identificacion", label: "Cédula", placeholder: "Ej: V-12345678" },
	],
	zelle: [
		{ key: "email", label: "Correo Zelle", placeholder: "Ej: pagos@tuempresa.com" },
		{ key: "name", label: "Nombre del titular", placeholder: "Ej: Juan Pérez" },
	],
	transferencia: [
		{ key: "banco", label: "Banco", placeholder: "Ej: Banco de Chile" },
		{ key: "tipo_cuenta", label: "Tipo de cuenta", placeholder: "Ej: Cuenta corriente" },
		{ key: "nro_cuenta", label: "Número de cuenta", placeholder: "Ej: 1234567890" },
		{ key: "identificacion", label: "RUT / Cédula", placeholder: "Ej: 12.345.678-9" },
		{ key: "titular", label: "Nombre del titular", placeholder: "Ej: Tu empresa SpA" },
		{ key: "email", label: "Correo (opcional)", placeholder: "Para confirmación" },
	],
	transferencia_bancaria: [
		{ key: "banco", label: "Banco", placeholder: "Ej: Banco de Chile" },
		{ key: "tipo_cuenta", label: "Tipo de cuenta", placeholder: "Ej: Cuenta corriente" },
		{ key: "nro_cuenta", label: "Número de cuenta", placeholder: "Ej: 1234567890" },
		{ key: "identificacion", label: "RUT / Cédula", placeholder: "Ej: 12.345.678-9" },
		{ key: "titular", label: "Nombre del titular", placeholder: "Ej: Tu empresa SpA" },
		{ key: "email", label: "Correo (opcional)", placeholder: "Para confirmación" },
	],
};

const FALLBACK_KEYS = [
	{ key: "phone", label: "Teléfono", placeholder: "Ej: 0412-1234567" },
	{ key: "email", label: "Correo", placeholder: "Ej: pagos@ejemplo.com" },
	{ key: "bank", label: "Banco", placeholder: "Ej: Nombre del banco" },
	{ key: "account_number", label: "Número de cuenta", placeholder: "Ej: 1234567890" },
	{ key: "instructions", label: "Instrucciones", placeholder: "Ej: Indicar nombre en el pago" },
];

function getFieldsForMethod(slug: string) {
	return METHOD_FIELDS[slug] ?? FALLBACK_KEYS;
}

function fieldLabel(slug: string, key: string): string {
	const known = getFieldsForMethod(slug).find((field) => field.key === key)?.label;
	if (known) return known;
	const words = key.replace(/_/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/** La lista guardada mezcla códigos y nombres ("CL", "Chile"): cada país se muestra una vez. */
function formatCountries(countries: string[] | null | undefined): string {
	const codes = new Set<string>();
	for (const value of countries ?? []) {
		const code = normalizeCountryCode(value) ?? String(value).trim();
		if (code) codes.add(code);
	}
	return codes.size > 0 ? [...codes].join(", ") : "Todos los países";
}

/* Botones, campos y textos con el mismo formato que el Inicio (igual que en Planes). */
const PRIMARY_BUTTON =
	"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";
const SECONDARY_BUTTON =
	"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-zinc-50";
const LINK_BUTTON =
	"inline-flex items-center gap-1 rounded text-xs font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:text-zinc-400 dark:hover:text-zinc-100";
const FIELD_CLASS =
	"h-9 rounded-lg border-zinc-200 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700";
const LABEL_CLASS = "text-[13px] font-medium text-zinc-700 dark:text-zinc-300";

export default function PlanPaymentMethodsPage() {
	const [methods, setMethods] = useState<Method[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editConfig, setEditConfig] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [listRef] = useSaasListAnimate<HTMLDivElement>();
	const { isMobile } = useSaasBreakpoint();
	const [mobileEditId, setMobileEditId] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/super-admin/plan-payment-methods")
			.then((res) => res.json())
			.then((json: { data?: Method[] }) => setMethods(json.data ?? []))
			.catch(() => setError("Error al cargar"))
			.finally(() => setLoading(false));
	}, []);

	const startEdit = (m: Method) => {
		setEditingId(m.id);
		setEditConfig({ ...m.config });
		if (isMobile) setMobileEditId(m.id);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setMobileEditId(null);
		setEditConfig({});
	};

	const saveConfig = async () => {
		if (!editingId) return;
		setSaving(true);
		try {
			const res = await fetch(`/api/super-admin/plan-payment-methods/${editingId}/config`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ config: editConfig }),
			});
			if (!res.ok) throw new Error("Error al guardar");
			setMethods((prev) => prev.map((m) => (m.id === editingId ? { ...m, config: { ...editConfig } } : m)));
			cancelEdit();
		} catch {
			setError("No se pudo guardar");
		} finally {
			setSaving(false);
		}
	};

	const toggleMethod = async (method: Method) => {
		setTogglingId(method.id);
		setError(null);
		try {
			const res = await fetch("/api/super-admin/plan-payment-methods", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: method.id, is_active: !method.is_active }),
			});
			const json = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				throw new Error(json.error ?? "No se pudo actualizar");
			}
			setMethods((prev) => prev.map((m) => (m.id === method.id ? { ...m, is_active: !m.is_active } : m)));
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo actualizar");
		} finally {
			setTogglingId(null);
		}
	};

	if (loading) {
		return <MethodsSkeleton />;
	}

	return (
		<div className="flex min-w-0 flex-col gap-6">
			<SaasPageHeader
				title="Métodos de cobro"
				description="Configura los datos que verá el cliente al pagar: teléfono Pago Móvil, email Zelle, banco, etc."
			/>

			{error && (
				<div
					role="alert"
					className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
				>
					{error}
				</div>
			)}

			{methods.length === 0 ? (
				<SaasEmptyState
					icon={CreditCard}
					title="No hay métodos configurados"
					description="Ejecuta la migración de Supabase que crea la tabla plan_payment_methods y el seed."
				/>
			) : (
				<div ref={listRef} className="grid min-w-0 gap-3 lg:grid-cols-2">
					{methods.map((m) => {
						const isRetired = RETIRED_METHOD_SLUGS.includes(m.slug);
						const isOnline = isRetired || ONLINE_METHOD_SLUGS.includes(m.slug);
						const isToggling = togglingId === m.id;
						const isEditing = editingId === m.id;
						const name = m.name ?? m.slug;
						return (
							<article
								key={m.id}
								className="@container flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
							>
								{/* Nombre, estado y switch de activación */}
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="flex min-w-0 flex-wrap items-center gap-1.5">
											<h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50" title={name}>
												{name}
											</h2>
											<SaasStatusBadge label={m.is_active ? "Activo" : "Inactivo"} variant={m.is_active ? "success" : "neutral"} />
											{isRetired ? (
												<SaasStatusBadge label="Retirado" variant="warning" />
											) : isOnline ? (
												<SaasStatusBadge label="Online" variant="info" />
											) : null}
										</div>
										<p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
											<span className="inline-flex min-w-0 items-center gap-1">
												<Globe className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
												<span className="truncate">{formatCountries(m.countries)}</span>
											</span>
											<span className="inline-flex items-center gap-1">
												{m.auto_verify ? (
													<ShieldCheck className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
												) : (
													<UserCheck className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
												)}
												{m.auto_verify ? "Auto-verificación" : "Validación manual"}
											</span>
										</p>
									</div>
									{/* El switch compartido no acepta aria-label: el <label> le da nombre accesible. */}
									<label className="flex shrink-0 items-center">
										<span className="sr-only">{`Activar ${name}`}</span>
										<SaasSwitch
											checked={m.is_active}
											onChange={() => void toggleMethod(m)}
											disabled={isToggling}
											label={isToggling ? "Actualizando…" : undefined}
										/>
									</label>
								</div>

								{/* Nota, datos guardados o formulario de edición */}
								<div className="mt-4 flex-1 border-t border-zinc-100 pt-4 dark:border-zinc-800">
									{isRetired ? (
										<ClampedNote
											text={
												m.is_active
													? "Ya no se ofrece en el alta ni en /cuenta, aunque esté activo. Puedes desactivarlo."
													: "Ya no se ofrece en el alta ni en /cuenta."
											}
										/>
									) : isOnline ? (
										<ClampedNote
											text={`Se configura con las variables de entorno (.env): PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET. No hace falta cargar datos aquí; el cliente paga en la página de ${name}.`}
										/>
									) : isEditing ? (
										<div className="grid gap-3 @sm:grid-cols-2">
											{getFieldsForMethod(m.slug).map(({ key, label, placeholder }) => (
												<label key={key} className="flex flex-col gap-1.5">
													<span className={LABEL_CLASS}>{label}</span>
													<Input
														value={editConfig[key] ?? ""}
														onChange={(e) => setEditConfig((prev) => ({ ...prev, [key]: e.target.value }))}
														placeholder={placeholder ?? ""}
														className={FIELD_CLASS}
													/>
												</label>
											))}
										</div>
									) : (
										<ConfigDetails slug={m.slug} config={m.config} />
									)}
								</div>

								{!isOnline && (
									<div className="mt-4 flex flex-wrap items-center gap-2">
										{isEditing ? (
											<>
												<button type="button" onClick={saveConfig} disabled={saving} className={PRIMARY_BUTTON}>
													{saving ? "Guardando…" : "Guardar"}
												</button>
												<button type="button" onClick={cancelEdit} className={SECONDARY_BUTTON}>
													Cancelar
												</button>
											</>
										) : (
											<button
												type="button"
												onClick={() => startEdit(m)}
												className={SECONDARY_BUTTON}
												aria-label={`Editar datos de ${name}`}
											>
												<Pencil className="h-3.5 w-3.5" aria-hidden />
												Editar datos
											</button>
										)}
									</div>
								)}
							</article>
						);
					})}
				</div>
			)}

			<Drawer
				open={!!mobileEditId && isMobile}
				onOpenChange={(open) => !open && setMobileEditId(null)}
				title="Editar método de pago"
				description="Completa los datos que verá el cliente al pagar."
			>
				{editingId && isMobile ? (
					<div className="grid gap-3">
						{getFieldsForMethod(methods.find((m) => m.id === editingId)?.slug ?? "").map(({ key, label, placeholder }) => (
							<label key={key} className="flex flex-col gap-1.5">
								<span className={LABEL_CLASS}>{label}</span>
								<Input
									value={editConfig[key] ?? ""}
									onChange={(e) => setEditConfig((prev) => ({ ...prev, [key]: e.target.value }))}
									placeholder={placeholder ?? ""}
									className={FIELD_CLASS}
								/>
							</label>
						))}
						<button
							type="button"
							onClick={() => {
								void saveConfig();
								setMobileEditId(null);
							}}
							disabled={saving}
							className={cn(PRIMARY_BUTTON, "mt-1 h-9 w-full")}
						>
							{saving ? "Guardando…" : "Guardar"}
						</button>
					</div>
				) : null}
			</Drawer>
		</div>
	);
}

/** Datos visibles antes de "Ver más": así las tarjetas quedan parejas en la grilla. */
const VISIBLE_CONFIG_ENTRIES = 4;

/** Un valor largo se corta a una línea en la vista compacta. */
function isLongConfigValue(value: string): boolean {
	return value.length > 28 || value.includes("\n");
}

/** Datos del método ya guardados: etiqueta tenue y valor en una línea, con opción de ver todo. */
function ConfigDetails({ slug, config }: { slug: string; config: Record<string, string> }) {
	const [expanded, setExpanded] = useState(false);
	const listId = useId();
	const entries = Object.entries(config).filter(([, v]) => Boolean(v));
	if (entries.length === 0) {
		return <p className="text-[13px] text-zinc-400 dark:text-zinc-500">Aún no hay datos cargados.</p>;
	}
	const hiddenCount = Math.max(0, entries.length - VISIBLE_CONFIG_ENTRIES);
	const canExpand = hiddenCount > 0 || entries.slice(0, VISIBLE_CONFIG_ENTRIES).some(([, v]) => isLongConfigValue(v));
	const shown = expanded ? entries : entries.slice(0, VISIBLE_CONFIG_ENTRIES);

	return (
		<div>
			<dl id={listId} className="grid gap-x-4 gap-y-2.5 @xs:grid-cols-2">
				{shown.map(([k, v]) => (
					<div key={k} className="min-w-0">
						<dt className="text-[11px] text-zinc-400 dark:text-zinc-500">{fieldLabel(slug, k)}</dt>
						<dd
							className={cn(
								"mt-0.5 text-[13px] text-zinc-700 dark:text-zinc-300",
								expanded ? "whitespace-pre-wrap break-words" : "truncate",
							)}
							title={expanded ? undefined : v}
						>
							{v}
						</dd>
					</div>
				))}
			</dl>
			{canExpand ? (
				<button
					type="button"
					onClick={() => setExpanded((open) => !open)}
					aria-expanded={expanded}
					aria-controls={listId}
					className={cn(LINK_BUTTON, "mt-3")}
				>
					{expanded ? "Ver menos" : hiddenCount > 0 ? `Ver ${hiddenCount} más` : "Ver completo"}
					<ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} aria-hidden />
				</button>
			) : null}
		</div>
	);
}

/** Nota larga (métodos online o retirados) cortada a dos líneas, con opción de leerla entera. */
function ClampedNote({ text }: { text: string }) {
	const [expanded, setExpanded] = useState(false);
	const noteId = useId();
	const canExpand = text.length > 110;
	return (
		<div>
			<p
				id={noteId}
				className={cn("text-[13px] leading-snug text-zinc-500 dark:text-zinc-400", !expanded && canExpand && "line-clamp-2")}
			>
				{text}
			</p>
			{canExpand ? (
				<button
					type="button"
					onClick={() => setExpanded((open) => !open)}
					aria-expanded={expanded}
					aria-controls={noteId}
					className={cn(LINK_BUTTON, "mt-2")}
				>
					{expanded ? "Ver menos" : "Ver completo"}
					<ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} aria-hidden />
				</button>
			) : null}
		</div>
	);
}

/** Mismo esqueleto que las tarjetas: nombre y switch, países, datos y botón. */
function MethodsSkeleton() {
	return (
		<div className="flex min-w-0 flex-col gap-6" aria-busy="true" aria-label="Cargando métodos de cobro">
			<div>
				<div className="h-7 w-44 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
				<div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
			</div>
			<div className="grid gap-3 lg:grid-cols-2">
				{["method-1", "method-2", "method-3", "method-4"].map((id) => (
					<div
						key={id}
						className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<div className="h-4 w-32 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
								<div className="mt-2.5 h-3 w-48 max-w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
							</div>
							<div className="h-6 w-11 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
						</div>
						<div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
							{["a", "b", "c", "d"].map((cell) => (
								<div key={cell}>
									<div className="h-2.5 w-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
									<div className="mt-1.5 h-3 w-24 max-w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
								</div>
							))}
						</div>
						<div className="mt-4 h-8 w-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
					</div>
				))}
			</div>
		</div>
	);
}
