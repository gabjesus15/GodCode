"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
	isPromoRule,
	isRuleExpired,
	type LoyaltyEarnRule,
	type LoyaltyEarnRuleInput,
	type LoyaltyRuleMode,
	type LoyaltyRuleScope,
} from "@/lib/loyalty/earn-rules-shared";

import type { UseLoyaltyRulesReturn } from "../hooks/use-loyalty-rules";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

const PRODUCT_RESULTS_LIMIT = 30;

const fieldClass = "mt-1 block h-9 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f]";
const labelClass = "block text-xs font-medium text-[#6e6e73]";

const numberFormat = new Intl.NumberFormat("es");
const dateFormat = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

function pointsLabel(points: number) {
	return `${numberFormat.format(points)} ${points === 1 ? "punto" : "puntos"}`;
}

/** Qué da la regla, en una línea. */
export function describeEarnRule(rule: LoyaltyEarnRule): string {
	if (rule.scope === "global") {
		return rule.mode === "per_order"
			? `${pointsLabel(rule.points)} por compra`
			: `${pointsLabel(rule.points)} por cada ${numberFormat.format(rule.perAmount ?? 0)} gastado`;
	}
	if (rule.scope === "product") return `${pointsLabel(rule.points)} por cada ${rule.productName ?? "producto"}`;
	return `${pointsLabel(rule.points)} por cada producto de ${rule.categoryName ?? "la categoría"}`;
}

function datesLabel(rule: Pick<LoyaltyEarnRule, "startsAt" | "endsAt">): string | null {
	const from = rule.startsAt ? dateFormat.format(new Date(rule.startsAt)) : null;
	const to = rule.endsAt ? dateFormat.format(new Date(rule.endsAt)) : null;
	if (from && to) return `Del ${from} al ${to}`;
	if (from) return `Desde el ${from}`;
	if (to) return `Hasta el ${to}`;
	return null;
}

type Draft = {
	scope: LoyaltyRuleScope;
	mode: LoyaltyRuleMode;
	points: string;
	perAmount: string;
	productId: string;
	categoryId: string;
	name: string;
	startsOn: string;
	endsOn: string;
	isActive: boolean;
};

const emptyDraft = (): Draft => ({
	scope: "global",
	mode: "per_amount",
	points: "1",
	perAmount: "1000",
	productId: "",
	categoryId: "",
	name: "",
	startsOn: "",
	endsOn: "",
	isActive: true,
});

/** yyyy-mm-dd del input de fecha, en la hora local del CEO. */
function toDateInput(iso: string | null): string {
	if (!iso) return "";
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInput(value: string, endOfDay: boolean): string | null {
	if (!value) return null;
	const d = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function ruleToDraft(rule: LoyaltyEarnRule): Draft {
	return {
		scope: rule.scope,
		mode: rule.mode ?? "per_amount",
		points: String(rule.points),
		perAmount: rule.perAmount == null ? "1000" : String(rule.perAmount),
		productId: rule.productId ?? "",
		categoryId: rule.categoryId ?? "",
		name: rule.name ?? "",
		startsOn: toDateInput(rule.startsAt),
		endsOn: toDateInput(rule.endsAt),
		isActive: rule.isActive,
	};
}

function draftToInput(draft: Draft): LoyaltyEarnRuleInput {
	return {
		name: draft.name.trim() || null,
		scope: draft.scope,
		mode: draft.scope === "global" ? draft.mode : null,
		points: Math.max(0, Math.floor(Number(draft.points) || 0)),
		perAmount: draft.scope === "global" && draft.mode === "per_amount" ? Number(draft.perAmount) || null : null,
		productId: draft.scope === "product" ? draft.productId || null : null,
		categoryId: draft.scope === "category" ? draft.categoryId || null : null,
		startsAt: fromDateInput(draft.startsOn, false),
		endsAt: fromDateInput(draft.endsOn, true),
		isActive: draft.isActive,
	};
}

function ruleToInput(rule: LoyaltyEarnRule): LoyaltyEarnRuleInput {
	return {
		name: rule.name,
		scope: rule.scope,
		mode: rule.mode,
		points: rule.points,
		perAmount: rule.perAmount,
		productId: rule.productId,
		categoryId: rule.categoryId,
		startsAt: rule.startsAt,
		endsAt: rule.endsAt,
		isActive: rule.isActive,
	};
}

const GROUPS: Array<{ scope: LoyaltyRuleScope; title: string; empty: string }> = [
	{ scope: "global", title: "Global", empty: "Sin reglas globales: las compras no suman puntos por monto ni por compra." },
	{ scope: "category", title: "Por categoría", empty: "Sin reglas por categoría." },
	{ scope: "product", title: "Por producto", empty: "Sin reglas por producto." },
];

/**
 * Editor de las reglas para ganar puntos (/cuenta › Mi menú). Las reglas se combinan:
 * las globales se suman y cada producto del pedido usa su regla más específica. Una
 * regla con fechas es una promoción y reemplaza a la permanente mientras dura.
 */
export function LoyaltyRulesEditor({ loyalty }: { loyalty: UseLoyaltyRulesReturn }) {
	const { rules, products, categories, loading, saving, error } = loyalty;
	const [draft, setDraft] = useState<Draft | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [productQuery, setProductQuery] = useState("");

	const productResults = useMemo(() => {
		const q = productQuery.trim().toLowerCase();
		if (!q) return [];
		return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, PRODUCT_RESULTS_LIMIT);
	}, [products, productQuery]);

	const selectedProduct = draft?.productId ? products.find((p) => p.id === draft.productId) : null;

	const startCreate = () => {
		loyalty.clearError();
		setEditingId(null);
		setDraft(emptyDraft());
		setProductQuery("");
	};

	const startEdit = (rule: LoyaltyEarnRule) => {
		loyalty.clearError();
		setEditingId(rule.id);
		setDraft(ruleToDraft(rule));
		setProductQuery("");
	};

	const cancel = () => {
		setDraft(null);
		setEditingId(null);
		loyalty.clearError();
	};

	const submit = async () => {
		if (!draft) return;
		const ok = await loyalty.saveRule(draftToInput(draft), editingId ?? undefined);
		if (ok) cancel();
	};

	const toggleActive = (rule: LoyaltyEarnRule) => {
		void loyalty.saveRule({ ...ruleToInput(rule), isActive: !rule.isActive }, rule.id);
	};

	const remove = (rule: LoyaltyEarnRule) => {
		if (!window.confirm(`¿Borrar la regla "${rule.name || describeEarnRule(rule)}"? Los puntos ya ganados no cambian.`)) return;
		void loyalty.deleteRule(rule.id);
	};

	const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

	return (
		<Card compact className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-sm font-semibold text-[#1d1d1f]">Cómo ganan puntos tus clientes</p>
					<p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#6e6e73]">
						Las reglas se suman: las globales cuentan sobre toda la compra y cada producto suma la regla de su
						producto o, si no tiene, la de su categoría. Una regla con fechas es una promoción: mientras dura,
						reemplaza a la normal.
					</p>
				</div>
				{!draft ? (
					<Button size="sm" onClick={startCreate} icon={<Plus className="h-3.5 w-3.5" />} disabled={loading}>
						Agregar regla
					</Button>
				) : null}
			</div>

			<Alert variant="info">
				Los puntos que tus clientes ya ganaron no cambian. Las reglas valen para las compras desde que las guardas,
				y si un pedido se cancela se le quitan sus puntos.
			</Alert>

			{error ? (
				<Alert variant="danger" onDismiss={loyalty.clearError}>
					{error}
				</Alert>
			) : null}

			{draft ? (
				<form
					className="space-y-3 rounded-xl border border-[#e5e5ea] bg-[#fafafa] p-3 sm:p-4"
					onSubmit={(e) => {
						e.preventDefault();
						void submit();
					}}
				>
					<p className="text-sm font-semibold text-[#1d1d1f]">{editingId ? "Editar regla" : "Nueva regla"}</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<label className={labelClass}>
							Tipo
							<select
								className={fieldClass}
								value={draft.scope === "global" ? `global:${draft.mode}` : draft.scope}
								onChange={(e) => {
									const value = e.target.value;
									if (value.startsWith("global:")) update({ scope: "global", mode: value.slice(7) as LoyaltyRuleMode });
									else update({ scope: value as LoyaltyRuleScope });
								}}
							>
								<option value="global:per_amount">Global · por dinero gastado</option>
								<option value="global:per_order">Global · por cada compra</option>
								<option value="category">Por categoría</option>
								<option value="product">Por producto</option>
							</select>
						</label>
						<label className={labelClass}>
							Nombre (opcional)
							<input
								className={fieldClass}
								value={draft.name}
								maxLength={80}
								placeholder="Promo pizzas de octubre"
								onChange={(e) => update({ name: e.target.value })}
							/>
						</label>
					</div>

					{draft.scope === "category" ? (
						<label className={labelClass}>
							Categoría
							<select className={fieldClass} value={draft.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
								<option value="">Elige una categoría</option>
								{categories.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</label>
					) : null}

					{draft.scope === "product" ? (
						<div className={labelClass}>
							Producto
							{selectedProduct ? (
								<div className="mt-1 flex h-9 items-center justify-between gap-2 rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f]">
									<span className="truncate">{selectedProduct.name}</span>
									<button
										type="button"
										className="text-xs font-medium text-indigo-600 hover:underline"
										onClick={() => update({ productId: "" })}
									>
										Cambiar
									</button>
								</div>
							) : (
								<>
									<input
										className={fieldClass}
										type="search"
										value={productQuery}
										placeholder="Busca en tu menú…"
										onChange={(e) => setProductQuery(e.target.value)}
									/>
									{productResults.length > 0 ? (
										<ul className="mt-1 max-h-52 overflow-y-auto rounded-xl border border-[#e5e5ea] bg-white p-1">
											{productResults.map((p) => (
												<li key={p.id}>
													<button
														type="button"
														className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-[#1d1d1f] hover:bg-[#f5f5f7]"
														onClick={() => {
															update({ productId: p.id });
															setProductQuery("");
														}}
													>
														{p.name}
													</button>
												</li>
											))}
										</ul>
									) : productQuery.trim() ? (
										<p className="mt-1 text-xs text-[#a1a1a6]">Ningún producto coincide.</p>
									) : null}
								</>
							)}
						</div>
					) : null}

					<div className="grid gap-3 sm:grid-cols-2">
						<label className={labelClass}>
							{draft.scope === "global" ? "Puntos" : "Puntos por unidad"}
							<input
								className={fieldClass}
								type="number"
								min={draft.scope === "global" ? 1 : 0}
								step={1}
								inputMode="numeric"
								value={draft.points}
								onChange={(e) => update({ points: e.target.value })}
							/>
						</label>
						{draft.scope === "global" && draft.mode === "per_amount" ? (
							<label className={labelClass}>
								Por cada (monto gastado)
								<input
									className={fieldClass}
									type="number"
									min={0}
									step="any"
									inputMode="decimal"
									value={draft.perAmount}
									onChange={(e) => update({ perAmount: e.target.value })}
								/>
							</label>
						) : null}
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<label className={labelClass}>
							Desde (opcional)
							<input className={fieldClass} type="date" value={draft.startsOn} onChange={(e) => update({ startsOn: e.target.value })} />
						</label>
						<label className={labelClass}>
							Hasta (opcional)
							<input className={fieldClass} type="date" value={draft.endsOn} onChange={(e) => update({ endsOn: e.target.value })} />
						</label>
					</div>
					<p className="text-xs text-[#a1a1a6]">
						Con fechas es una promoción: mientras dura reemplaza a la regla normal del mismo producto, categoría o
						tipo global. Con 0 puntos, una promo puede quitar los puntos de un producto.
					</p>

					<label className="flex items-center gap-2 text-sm text-[#1d1d1f]">
						<input type="checkbox" checked={draft.isActive} onChange={(e) => update({ isActive: e.target.checked })} />
						Activa
					</label>

					<div className="flex flex-wrap gap-2">
						<Button type="submit" size="sm" loading={saving}>
							{editingId ? "Guardar cambios" : "Crear regla"}
						</Button>
						<Button type="button" variant="secondary" size="sm" disabled={saving} onClick={cancel}>
							Cancelar
						</Button>
					</div>
				</form>
			) : null}

			{loading ? (
				<p className="text-sm text-[#6e6e73]">Cargando reglas…</p>
			) : (
				<div className="space-y-4">
					{GROUPS.map((group) => {
						const items = rules.filter((rule) => rule.scope === group.scope);
						return (
							<div key={group.scope} className="space-y-2">
								<p className="text-xs font-semibold uppercase tracking-wide text-[#a1a1a6]">{group.title}</p>
								{items.length === 0 ? (
									<p className="text-[13px] text-[#a1a1a6]">{group.empty}</p>
								) : (
									<ul className="divide-y divide-[#f0f0f2] rounded-xl border border-[#e5e5ea]">
										{items.map((rule) => {
											const dates = datesLabel(rule);
											const expired = isRuleExpired(rule);
											return (
												<li key={rule.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
													<div className="min-w-0 flex-1">
														<p className="text-sm font-medium text-[#1d1d1f]">{describeEarnRule(rule)}</p>
														<p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#6e6e73]">
															{rule.name ? <span>{rule.name}</span> : null}
															{isPromoRule(rule) ? <Badge variant="accent">Promoción</Badge> : null}
															{dates ? <span>{dates}</span> : null}
															{expired ? <Badge variant="neutral">Terminó</Badge> : null}
															{!rule.isActive ? <Badge variant="warning">Pausada</Badge> : null}
														</p>
													</div>
													<div className="flex items-center gap-1.5">
														<Button
															variant="ghost"
															size="sm"
															disabled={saving}
															onClick={() => toggleActive(rule)}
														>
															{rule.isActive ? "Pausar" : "Activar"}
														</Button>
														<Button
															variant="ghost"
															size="sm"
															disabled={saving}
															onClick={() => startEdit(rule)}
															icon={<Pencil className="h-3.5 w-3.5" />}
														>
															Editar
														</Button>
														<Button
															variant="ghost"
															size="sm"
															disabled={saving}
															onClick={() => remove(rule)}
															icon={<Trash2 className="h-3.5 w-3.5" />}
															aria-label="Borrar regla"
														>
															Borrar
														</Button>
													</div>
												</li>
											);
										})}
									</ul>
								)}
							</div>
						);
					})}
				</div>
			)}
		</Card>
	);
}
