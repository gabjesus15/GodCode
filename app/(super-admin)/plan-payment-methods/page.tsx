"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";
import { useSaasBreakpoint } from "@/components/super-admin/shared/use-saas-breakpoint";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { CreditCard } from "lucide-react";
import { normalizeCountryCode } from "@/lib/geo/country-registry";

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
		return (
			<div className="flex min-h-[200px] flex-col gap-4">
				<div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
				<div className="grid gap-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-col gap-5 sm:gap-6">
			<SaasPageHeader
				title="Métodos de cobro"
				description="Configura los datos que verá el cliente al pagar: teléfono Pago Móvil, email Zelle, banco, etc."
			/>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
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
				<div ref={listRef} className="grid gap-4">
					{methods.map((m) => {
						const isRetired = RETIRED_METHOD_SLUGS.includes(m.slug);
						const isOnline = isRetired || ONLINE_METHOD_SLUGS.includes(m.slug);
						const isToggling = togglingId === m.id;
						const isEditing = editingId === m.id;
						return (
							<Card
								key={m.id}
								className="rounded-2xl border-zinc-200 bg-white p-4 shadow-none dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
							>
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<p className="font-medium text-zinc-900 dark:text-zinc-100">{m.name ?? m.slug}</p>
											<SaasStatusBadge label={m.is_active ? "Activo" : "Inactivo"} variant={m.is_active ? "success" : "neutral"} />
											{isRetired ? (
												<SaasStatusBadge label="Retirado" variant="warning" />
											) : isOnline ? (
												<SaasStatusBadge label="Online" variant="info" />
											) : null}
										</div>
										<p className="mt-0.5 text-xs text-zinc-500">
											{formatCountries(m.countries)} · {m.auto_verify ? "Auto-verificación" : "Validación manual"}
										</p>
									</div>
									<div className="flex shrink-0 flex-wrap items-center gap-2">
										{!isOnline && !isEditing && (
											<Button type="button" variant="outline" size="sm" onClick={() => startEdit(m)}>
												Editar datos
											</Button>
										)}
										{!isOnline && isEditing && (
											<>
												<Button type="button" size="sm" onClick={saveConfig} disabled={saving}>
													{saving ? "Guardando…" : "Guardar"}
												</Button>
												<Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
													Cancelar
												</Button>
											</>
										)}
										<SaasSwitch
											checked={m.is_active}
											onChange={() => void toggleMethod(m)}
											disabled={isToggling}
											label={isToggling ? "Actualizando…" : undefined}
										/>
									</div>
								</div>

								{isRetired ? (
									<p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
										{m.is_active
											? "Ya no se ofrece en el alta ni en /cuenta, aunque esté activo. Puedes desactivarlo."
											: "Ya no se ofrece en el alta ni en /cuenta."}
									</p>
								) : isOnline ? (
									<p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
										Se configura con las variables de entorno (.env): PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET. No hace falta cargar datos aquí; el cliente paga en la página de {m.name ?? m.slug}.
									</p>
								) : isEditing ? (
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										{getFieldsForMethod(m.slug).map(({ key, label, placeholder }) => (
											<label key={key} className="flex flex-col gap-1.5 text-sm">
												<span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
												<Input
													value={editConfig[key] ?? ""}
													onChange={(e) => setEditConfig((prev) => ({ ...prev, [key]: e.target.value }))}
													placeholder={placeholder ?? ""}
													className="h-10 rounded-xl"
												/>
											</label>
										))}
									</div>
								) : null}

								{!isOnline && !isEditing && Object.keys(m.config).length > 0 && (
									<dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
										{Object.entries(m.config).map(([k, v]) =>
											v ? (
												<div key={k}>
													<dt className="text-zinc-500">{fieldLabel(m.slug, k)}</dt>
													<dd className="font-medium text-zinc-900 dark:text-zinc-100">{v}</dd>
												</div>
											) : null,
										)}
									</dl>
								)}
							</Card>
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
							<label key={key} className="flex flex-col gap-1 text-sm">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
								<Input
									value={editConfig[key] ?? ""}
									onChange={(e) => setEditConfig((prev) => ({ ...prev, [key]: e.target.value }))}
									placeholder={placeholder ?? ""}
									className="h-10 rounded-xl"
								/>
							</label>
						))}
						<Button
							type="button"
							onClick={() => {
								void saveConfig();
								setMobileEditId(null);
							}}
							disabled={saving}
						>
							{saving ? "Guardando…" : "Guardar"}
						</Button>
					</div>
				) : null}
			</Drawer>
		</div>
	);
}
