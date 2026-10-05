"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, Pencil, Plus, RefreshCw, TicketPercent, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { SaasCheckbox } from "@/components/super-admin/shared/saas-checkbox";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { useSaasListAnimate } from "@/components/super-admin/shared/use-saas-list-animate";
import { resolveCouponStatus, type CouponStatus } from "@/lib/billing/subscription-coupon-admin";
import {
	describeCouponValueEs,
	generateCouponCode,
	type SubscriptionCouponKind,
	type SubscriptionCouponRow,
} from "@/lib/billing/subscription-coupons";
import type { StatusTone } from "@/lib/status/status-labels";
import { cn } from "@/utils/cn";

/**
 * Cupones del alta: los crea el equipo aquí y la persona los escribe en el paso de pago
 * del registro (/onboarding/pago). Ver `lib/billing/subscription-coupons`.
 */

type Coupon = SubscriptionCouponRow;
type Plan = { id: string; name: string; is_public: boolean; is_active: boolean };

type Redemption = {
	id: string;
	applicationId: string | null;
	companyId: string | null;
	email: string;
	businessName: string | null;
	paymentReference: string | null;
	baseAmountUsd: number;
	discountUsd: number;
	freeMonths: number;
	redeemedAt: string;
};

type FormState = {
	code: string;
	description: string;
	kind: SubscriptionCouponKind;
	value: string;
	min_months: string;
	plan_ids: string[];
	keeps_promo: boolean;
	max_redemptions: string;
	valid_from: string;
	valid_until: string;
	is_active: boolean;
};

const EMPTY_FORM: FormState = {
	code: "",
	description: "",
	kind: "percent",
	value: "",
	min_months: "1",
	plan_ids: [],
	keeps_promo: true,
	max_redemptions: "",
	valid_from: "",
	valid_until: "",
	is_active: true,
};

const KIND_OPTIONS: Array<{ value: SubscriptionCouponKind; label: string }> = [
	{ value: "percent", label: "Porcentaje de descuento" },
	{ value: "fixed", label: "Monto fijo en USD" },
	{ value: "free_months", label: "Meses gratis" },
];

const MONTH_OPTIONS = [1, 3, 6, 12].map((months) => ({ value: String(months), label: `${months} ${months === 1 ? "mes" : "meses"}` }));

const STATUS_LABELS: Record<CouponStatus, { label: string; tone: StatusTone }> = {
	active: { label: "Activo", tone: "success" },
	inactive: { label: "Inactivo", tone: "neutral" },
	scheduled: { label: "Programado", tone: "info" },
	expired: { label: "Vencido", tone: "warning" },
	exhausted: { label: "Agotado", tone: "warning" },
};

/* Mismos botones y campos que Métodos de cobro. */
const PRIMARY_BUTTON =
	"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";
const SECONDARY_BUTTON =
	"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-zinc-50";
const DANGER_BUTTON =
	"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30";
const LINK_BUTTON =
	"inline-flex items-center gap-1 rounded text-xs font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:text-zinc-400 dark:hover:text-zinc-100";
const FIELD_CLASS =
	"h-9 rounded-lg border-zinc-200 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700";
const LABEL_CLASS = "text-[13px] font-medium text-zinc-700 dark:text-zinc-300";

const dateFormatter = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function formatDay(iso: string | null | undefined): string {
	if (!iso) return "";
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

function formatWhen(iso: string | null | undefined): string {
	if (!iso) return "";
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? "" : dateTimeFormatter.format(date);
}

function formatUsd(value: number): string {
	return `$${(Number(value) || 0).toFixed(2)}`;
}

/** ISO → valor de un `<input type="datetime-local">` en la hora local del navegador. */
function toLocalInput(iso: string | null): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
	if (!value.trim()) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toForm(coupon: Coupon): FormState {
	return {
		code: coupon.code,
		description: coupon.description ?? "",
		kind: coupon.kind,
		value: String(coupon.value ?? ""),
		min_months: String(coupon.min_months ?? 1),
		plan_ids: coupon.plan_ids ?? [],
		keeps_promo: coupon.keeps_promo !== false,
		max_redemptions: coupon.max_redemptions != null ? String(coupon.max_redemptions) : "",
		valid_from: toLocalInput(coupon.valid_from),
		valid_until: toLocalInput(coupon.valid_until),
		is_active: coupon.is_active,
	};
}

function toPayload(form: FormState) {
	return {
		code: form.code,
		description: form.description,
		kind: form.kind,
		value: Number(form.value),
		min_months: Number(form.min_months) || 1,
		plan_ids: form.plan_ids,
		keeps_promo: form.keeps_promo,
		max_redemptions: form.max_redemptions.trim() === "" ? null : Number(form.max_redemptions),
		valid_from: fromLocalInput(form.valid_from),
		valid_until: fromLocalInput(form.valid_until),
		is_active: form.is_active,
	};
}

function describeWindow(coupon: Coupon): string {
	const from = formatDay(coupon.valid_from);
	const until = formatDay(coupon.valid_until);
	if (from && until) return `${from} → ${until}`;
	if (until) return `Hasta ${until}`;
	if (from) return `Desde ${from}`;
	return "Sin vencimiento";
}

function describeUses(coupon: Coupon): string {
	const count = Number(coupon.redemptions_count ?? 0) || 0;
	if (coupon.max_redemptions != null) return `${count} de ${coupon.max_redemptions}`;
	return `${count} ${count === 1 ? "uso" : "usos"} · sin límite`;
}

export default function SubscriptionCouponsPage() {
	const { readOnly } = useAdminRole();
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; coupon: Coupon } | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState<Coupon | null>(null);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [openRedemptions, setOpenRedemptions] = useState<string | null>(null);
	const [redemptions, setRedemptions] = useState<Record<string, Redemption[] | "loading" | "error">>({});
	const [listRef] = useSaasListAnimate<HTMLDivElement>();

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/super-admin/subscription-coupons", { cache: "no-store" });
			const json = (await res.json().catch(() => ({}))) as { data?: Coupon[]; plans?: Plan[]; error?: string };
			if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar los cupones");
			setCoupons(json.data ?? []);
			setPlans(json.plans ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudieron cargar los cupones");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const planNames = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.name])), [plans]);
	const visibleCoupons = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return coupons;
		return coupons.filter((coupon) => coupon.code.toLowerCase().includes(needle) || (coupon.description ?? "").toLowerCase().includes(needle));
	}, [coupons, query]);

	const openCreate = () => {
		setForm({ ...EMPTY_FORM, code: generateCouponCode(8) });
		setFormError(null);
		setEditing({ mode: "create" });
	};

	const openEdit = (coupon: Coupon) => {
		setForm(toForm(coupon));
		setFormError(null);
		setEditing({ mode: "edit", coupon });
	};

	const closeForm = () => {
		if (saving) return;
		setEditing(null);
		setFormError(null);
	};

	const submitForm = async () => {
		if (!editing) return;
		setSaving(true);
		setFormError(null);
		try {
			const isCreate = editing.mode === "create";
			const res = await fetch(isCreate ? "/api/super-admin/subscription-coupons" : `/api/super-admin/subscription-coupons/${editing.coupon.id}`, {
				method: isCreate ? "POST" : "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(toPayload(form)),
			});
			const json = (await res.json().catch(() => ({}))) as { data?: Coupon; error?: string };
			if (!res.ok || !json.data) throw new Error(json.error ?? "No se pudo guardar el cupón");
			const saved = json.data;
			setCoupons((prev) => (isCreate ? [saved, ...prev] : prev.map((coupon) => (coupon.id === saved.id ? saved : coupon))));
			setEditing(null);
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "No se pudo guardar el cupón");
		} finally {
			setSaving(false);
		}
	};

	const toggleActive = async (coupon: Coupon) => {
		setTogglingId(coupon.id);
		setError(null);
		try {
			const res = await fetch(`/api/super-admin/subscription-coupons/${coupon.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ is_active: !coupon.is_active }),
			});
			const json = (await res.json().catch(() => ({}))) as { data?: Coupon; error?: string };
			if (!res.ok || !json.data) throw new Error(json.error ?? "No se pudo actualizar");
			setCoupons((prev) => prev.map((item) => (item.id === coupon.id ? json.data! : item)));
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo actualizar");
		} finally {
			setTogglingId(null);
		}
	};

	const confirmDelete = async () => {
		if (!deleting) return;
		setDeleteBusy(true);
		setError(null);
		try {
			const res = await fetch(`/api/super-admin/subscription-coupons/${deleting.id}`, { method: "DELETE" });
			const json = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(json.error ?? "No se pudo borrar el cupón");
			setCoupons((prev) => prev.filter((coupon) => coupon.id !== deleting.id));
			setDeleting(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo borrar el cupón");
			setDeleting(null);
		} finally {
			setDeleteBusy(false);
		}
	};

	const copyCode = (coupon: Coupon) => {
		void navigator.clipboard?.writeText(coupon.code).then(() => {
			setCopiedId(coupon.id);
			window.setTimeout(() => setCopiedId((current) => (current === coupon.id ? null : current)), 1500);
		});
	};

	const toggleRedemptions = async (coupon: Coupon) => {
		if (openRedemptions === coupon.id) {
			setOpenRedemptions(null);
			return;
		}
		setOpenRedemptions(coupon.id);
		if (redemptions[coupon.id] && redemptions[coupon.id] !== "error") return;
		setRedemptions((prev) => ({ ...prev, [coupon.id]: "loading" }));
		try {
			const res = await fetch(`/api/super-admin/subscription-coupons/${coupon.id}`, { cache: "no-store" });
			const json = (await res.json().catch(() => ({}))) as { data?: Coupon; redemptions?: Redemption[]; error?: string };
			if (!res.ok) throw new Error(json.error ?? "error");
			setRedemptions((prev) => ({ ...prev, [coupon.id]: json.redemptions ?? [] }));
			if (json.data) setCoupons((prev) => prev.map((item) => (item.id === coupon.id ? json.data! : item)));
		} catch {
			setRedemptions((prev) => ({ ...prev, [coupon.id]: "error" }));
		}
	};

	const valueLabel = form.kind === "percent" ? "Porcentaje (1 a 100)" : form.kind === "fixed" ? "Monto en USD" : "Meses gratis (1 a 12)";
	const valuePlaceholder = form.kind === "percent" ? "Ej: 20" : form.kind === "fixed" ? "Ej: 10" : "Ej: 1";

	if (loading) return <CouponsSkeleton />;

	return (
		<div className="flex min-w-0 flex-col gap-6">
			<SaasPageHeader
				title="Cupones del alta"
				description="Códigos que un negocio nuevo escribe al pagar su registro: descuento, monto fijo o meses gratis. Los cupones de los comensales se gestionan en cada empresa."
				action={
					!readOnly ? (
						<button type="button" onClick={openCreate} className={PRIMARY_BUTTON}>
							<Plus className="h-3.5 w-3.5" aria-hidden />
							Nuevo cupón
						</button>
					) : undefined
				}
			/>

			{error ? (
				<div
					role="alert"
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
				>
					<span>{error}</span>
					<button type="button" onClick={() => void load()} className={cn(LINK_BUTTON, "text-red-700 hover:text-red-900 dark:text-red-300")}>
						<RefreshCw className="h-3.5 w-3.5" aria-hidden />
						Reintentar
					</button>
				</div>
			) : null}

			{coupons.length === 0 ? (
				<SaasEmptyState
					icon={TicketPercent}
					title="Todavía no hay cupones"
					description="Crea el primero: por ejemplo LANZAMIENTO20 con 20 % de descuento en el primer pago, o un código con 2 meses gratis para un aliado."
				/>
			) : (
				<>
					{coupons.length > 4 ? (
						<label className="flex max-w-sm flex-col gap-1.5">
							<span className="sr-only">Buscar cupón</span>
							<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código o descripción" className={FIELD_CLASS} />
						</label>
					) : null}
					<div ref={listRef} className="grid min-w-0 gap-3 lg:grid-cols-2">
						{visibleCoupons.map((coupon) => {
							const status = resolveCouponStatus(coupon);
							const badge = STATUS_LABELS[status];
							const planList = (coupon.plan_ids ?? []).map((id) => planNames.get(id) ?? "Plan eliminado");
							const isToggling = togglingId === coupon.id;
							const panel = redemptions[coupon.id];
							const showRedemptions = openRedemptions === coupon.id;
							return (
								<article
									key={coupon.id}
									className="@container flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="flex min-w-0 flex-wrap items-center gap-2">
												<h2 className="truncate font-mono text-base font-semibold tracking-wide text-zinc-950 dark:text-zinc-50" title={coupon.code}>
													{coupon.code}
												</h2>
												<button
													type="button"
													onClick={() => copyCode(coupon)}
													className={LINK_BUTTON}
													aria-label={`Copiar el código ${coupon.code}`}
												>
													{copiedId === coupon.id ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
													{copiedId === coupon.id ? "Copiado" : "Copiar"}
												</button>
												<SaasStatusBadge label={badge.label} variant={badge.tone} />
											</div>
											<p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
												{describeCouponValueEs(coupon)}
												<span className="font-normal text-zinc-500 dark:text-zinc-400">
													{coupon.keeps_promo ? " · mantiene la promo +1 mes" : " · reemplaza la promo +1 mes"}
												</span>
											</p>
											{coupon.description ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{coupon.description}</p> : null}
										</div>
										<label className="flex shrink-0 items-center">
											<span className="sr-only">{`Activar ${coupon.code}`}</span>
											<SaasSwitch
												checked={coupon.is_active}
												onChange={() => void toggleActive(coupon)}
												disabled={isToggling || readOnly}
												label={isToggling ? "Actualizando…" : undefined}
											/>
										</label>
									</div>

									<dl className="mt-4 grid gap-x-4 gap-y-2.5 border-t border-zinc-100 pt-4 @xs:grid-cols-2 dark:border-zinc-800">
										<div className="min-w-0">
											<dt className="text-[11px] text-zinc-400 dark:text-zinc-500">Usos</dt>
											<dd className="mt-0.5 text-[13px] text-zinc-700 dark:text-zinc-300">{describeUses(coupon)}</dd>
										</div>
										<div className="min-w-0">
											<dt className="text-[11px] text-zinc-400 dark:text-zinc-500">Vigencia</dt>
											<dd className="mt-0.5 text-[13px] text-zinc-700 dark:text-zinc-300">{describeWindow(coupon)}</dd>
										</div>
										<div className="min-w-0">
											<dt className="text-[11px] text-zinc-400 dark:text-zinc-500">Meses mínimos</dt>
											<dd className="mt-0.5 text-[13px] text-zinc-700 dark:text-zinc-300">
												{coupon.min_months > 1 ? `Pagar al menos ${coupon.min_months} meses` : "Cualquier cantidad"}
											</dd>
										</div>
										<div className="min-w-0">
											<dt className="text-[11px] text-zinc-400 dark:text-zinc-500">Planes</dt>
											<dd className="mt-0.5 truncate text-[13px] text-zinc-700 dark:text-zinc-300" title={planList.join(", ")}>
												{planList.length > 0 ? planList.join(", ") : "Todos"}
											</dd>
										</div>
									</dl>

									<div className="mt-4 flex flex-wrap items-center gap-2">
										{!readOnly ? (
											<button type="button" onClick={() => openEdit(coupon)} className={SECONDARY_BUTTON} aria-label={`Editar ${coupon.code}`}>
												<Pencil className="h-3.5 w-3.5" aria-hidden />
												Editar
											</button>
										) : null}
										<button
											type="button"
											onClick={() => void toggleRedemptions(coupon)}
											className={SECONDARY_BUTTON}
											aria-expanded={showRedemptions}
										>
											Canjes
											<ChevronDown className={cn("h-3.5 w-3.5 transition", showRedemptions && "rotate-180")} aria-hidden />
										</button>
										{!readOnly && Number(coupon.redemptions_count ?? 0) === 0 ? (
											<button type="button" onClick={() => setDeleting(coupon)} className={cn(DANGER_BUTTON, "ml-auto")} aria-label={`Borrar ${coupon.code}`}>
												<Trash2 className="h-3.5 w-3.5" aria-hidden />
												Borrar
											</button>
										) : null}
									</div>

									{showRedemptions ? (
										<div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
											{panel === "loading" || panel === undefined ? (
												<p className="text-[13px] text-zinc-400">Cargando canjes…</p>
											) : panel === "error" ? (
												<p className="text-[13px] text-red-600 dark:text-red-400">No se pudieron cargar los canjes.</p>
											) : panel.length === 0 ? (
												<p className="text-[13px] text-zinc-400 dark:text-zinc-500">Nadie lo ha usado todavía.</p>
											) : (
												<ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
													{panel.map((row) => (
														<li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-[13px]">
															<div className="min-w-0">
																<p className="truncate font-medium text-zinc-800 dark:text-zinc-200">{row.businessName ?? row.email}</p>
																<p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
																	{row.businessName ? `${row.email} · ` : ""}
																	{formatWhen(row.redeemedAt)}
																	{row.paymentReference ? ` · ${row.paymentReference}` : ""}
																</p>
															</div>
															<p className="whitespace-nowrap text-zinc-700 dark:text-zinc-300">
																{row.discountUsd > 0 ? `−${formatUsd(row.discountUsd)} de ${formatUsd(row.baseAmountUsd)}` : null}
																{row.freeMonths > 0 ? `+${row.freeMonths} ${row.freeMonths === 1 ? "mes" : "meses"} gratis` : null}
																{row.discountUsd <= 0 && row.freeMonths <= 0 ? "Canjeado" : null}
															</p>
														</li>
													))}
												</ul>
											)}
										</div>
									) : null}
								</article>
							);
						})}
					</div>
					{visibleCoupons.length === 0 ? (
						<p className="text-sm text-zinc-500 dark:text-zinc-400">Ningún cupón coincide con «{query}».</p>
					) : null}
				</>
			)}

			<Modal
				isOpen={editing != null}
				onClose={closeForm}
				title={editing?.mode === "edit" ? `Editar ${editing.coupon.code}` : "Nuevo cupón"}
				description="Lo que la persona ve al escribir el código en el paso de pago de su registro."
				className="max-w-xl"
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void submitForm();
					}}
					className="grid gap-4"
				>
					<div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
						<label className="flex flex-col gap-1.5">
							<span className={LABEL_CLASS}>Código</span>
							<Input
								value={form.code}
								onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))}
								placeholder="Ej: LANZAMIENTO20"
								maxLength={32}
								autoCapitalize="characters"
								spellCheck={false}
								className={cn(FIELD_CLASS, "font-mono uppercase tracking-wide")}
								required
							/>
						</label>
						<button
							type="button"
							onClick={() => setForm((prev) => ({ ...prev, code: generateCouponCode(8) }))}
							className={cn(SECONDARY_BUTTON, "h-9")}
						>
							<RefreshCw className="h-3.5 w-3.5" aria-hidden />
							Generar
						</button>
					</div>
					<p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">De 4 a 32 caracteres: letras, números, guion o guion bajo. Se guarda en mayúsculas.</p>

					<label className="flex flex-col gap-1.5">
						<span className={LABEL_CLASS}>Descripción interna (opcional)</span>
						<Textarea
							value={form.description}
							onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
							placeholder="Ej: Campaña de Instagram de octubre. La persona la ve junto al cupón."
							maxLength={200}
							rows={2}
							className="rounded-lg border-zinc-200 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700"
						/>
					</label>

					<div className="grid gap-3 sm:grid-cols-2">
						<SaasSelect
							label="Tipo"
							value={form.kind}
							options={KIND_OPTIONS}
							onChange={(value) => setForm((prev) => ({ ...prev, kind: value as SubscriptionCouponKind, value: "" }))}
						/>
						<label className="flex flex-col gap-1.5">
							<span className={LABEL_CLASS}>{valueLabel}</span>
							<Input
								type="number"
								inputMode="decimal"
								min={form.kind === "percent" || form.kind === "free_months" ? 1 : 0.01}
								max={form.kind === "percent" ? 100 : form.kind === "free_months" ? 12 : undefined}
								step={form.kind === "free_months" ? 1 : form.kind === "percent" ? 0.5 : 0.01}
								value={form.value}
								onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
								placeholder={valuePlaceholder}
								className={FIELD_CLASS}
								required
							/>
						</label>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<SaasSelect
							label="Meses mínimos a pagar"
							value={MONTH_OPTIONS.some((option) => option.value === form.min_months) ? form.min_months : "1"}
							options={MONTH_OPTIONS}
							onChange={(value) => setForm((prev) => ({ ...prev, min_months: value }))}
						/>
						<label className="flex flex-col gap-1.5">
							<span className={LABEL_CLASS}>Límite de usos (vacío = sin límite)</span>
							<Input
								type="number"
								inputMode="numeric"
								min={1}
								step={1}
								value={form.max_redemptions}
								onChange={(e) => setForm((prev) => ({ ...prev, max_redemptions: e.target.value }))}
								placeholder="Ej: 50"
								className={FIELD_CLASS}
							/>
						</label>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<label className="flex flex-col gap-1.5">
							<span className={LABEL_CLASS}>Válido desde (opcional)</span>
							<Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm((prev) => ({ ...prev, valid_from: e.target.value }))} className={FIELD_CLASS} />
						</label>
						<label className="flex flex-col gap-1.5">
							<span className={LABEL_CLASS}>Válido hasta (opcional)</span>
							<Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm((prev) => ({ ...prev, valid_until: e.target.value }))} className={FIELD_CLASS} />
						</label>
					</div>

					<fieldset className="flex flex-col gap-2">
						<legend className={LABEL_CLASS}>Planes en los que vale</legend>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">Sin marcar ninguno vale para todos los planes a la venta.</p>
						<div className="flex flex-wrap gap-x-5 gap-y-2">
							{plans
								.filter((plan) => plan.is_active !== false && (plan.is_public || form.plan_ids.includes(plan.id)))
								.map((plan) => (
									<SaasCheckbox
										key={plan.id}
										label={plan.name}
										checked={form.plan_ids.includes(plan.id)}
										onChange={(checked) =>
											setForm((prev) => ({
												...prev,
												plan_ids: checked ? [...prev.plan_ids, plan.id] : prev.plan_ids.filter((id) => id !== plan.id),
											}))
										}
									/>
								))}
						</div>
					</fieldset>

					<div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
						<SaasSwitch
							checked={form.keeps_promo}
							onChange={(checked) => setForm((prev) => ({ ...prev, keeps_promo: checked }))}
							label="Mantener la promo «+1 mes gratis en tu primer pago»"
							description="Apágalo si el cupón ya es generoso y no quieres sumar también el mes de regalo."
						/>
						<SaasSwitch
							checked={form.is_active}
							onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
							label="Activo"
							description="Un cupón inactivo no se puede aplicar, aunque esté en fecha."
						/>
					</div>

					{formError ? (
						<p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
							{formError}
						</p>
					) : null}

					<div className="flex flex-wrap items-center justify-end gap-2 pt-1">
						<button type="button" onClick={closeForm} className={cn(SECONDARY_BUTTON, "h-9")} disabled={saving}>
							Cancelar
						</button>
						<button type="submit" className={cn(PRIMARY_BUTTON, "h-9")} disabled={saving}>
							{saving ? "Guardando…" : editing?.mode === "edit" ? "Guardar cambios" : "Crear cupón"}
						</button>
					</div>
				</form>
			</Modal>

			<Modal
				isOpen={deleting != null}
				onClose={() => (deleteBusy ? undefined : setDeleting(null))}
				title={`Borrar ${deleting?.code ?? ""}`}
				description="Nadie lo ha usado, así que se borra del todo. Si una solicitud lo tenía aplicado, se le quita."
			>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<button type="button" onClick={() => setDeleting(null)} className={cn(SECONDARY_BUTTON, "h-9")} disabled={deleteBusy}>
						Cancelar
					</button>
					<button type="button" onClick={() => void confirmDelete()} className={cn(DANGER_BUTTON, "h-9")} disabled={deleteBusy}>
						{deleteBusy ? "Borrando…" : "Borrar cupón"}
					</button>
				</div>
			</Modal>
		</div>
	);
}

function CouponsSkeleton() {
	return (
		<div className="flex min-w-0 flex-col gap-6" aria-busy="true" aria-label="Cargando cupones">
			<div>
				<div className="h-7 w-44 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
				<div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
			</div>
			<div className="grid gap-3 lg:grid-cols-2">
				{["a", "b", "c", "d"].map((id) => (
					<div key={id} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<div className="h-5 w-40 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
								<div className="mt-2.5 h-3 w-56 max-w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
							</div>
							<div className="h-6 w-11 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
						</div>
						<div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
							{["1", "2", "3", "4"].map((cell) => (
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
