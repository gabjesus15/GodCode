"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Drawer } from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { SaasCheckbox } from "@/components/super-admin/shared/saas-checkbox";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from "../../../lib/i18n/config";
import {
	buildPlanMarketingLinesI18nPayload,
	buildPlanNameI18nPayload,
	createLocalizedPlanMarketingLinesState,
	createLocalizedPlanNameState,
	resolvePlanMarketingLines,
} from "@/lib/plans/plan-i18n";
import { normalizeMarketingLines } from "@/lib/plans/plan-marketing-lines";
import {
	DEFAULT_ROLE_NAV_PERMISSIONS,
	TENANT_ADMIN_TAB_OPTIONS,
} from "@/lib/super-admin/tenant-admin-tabs";
import {
	extractCeoTabsFromPlanFeatures,
	upsertPlanFeaturesCeoTabs,
} from "@/lib/plans/tenant-plan-features";

function newDescriptionLineId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `desc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

const clpCurrency = new Intl.NumberFormat("es-CL", {
	style: "currency",
	currency: "CLP",
	maximumFractionDigits: 0,
});

type Plan = {
	id: string;
	name: string | null;
	name_i18n?: unknown;
	price: number | null;
	prices_by_continent?: Partial<
		Record<PriceByContinent["continent"], { price: number; currency: string }>
	> | null;
	max_branches: number | null;
	max_users: number | null;
	is_public: boolean | null;
	is_active: boolean | null;
	features?: unknown;
	marketing_lines?: unknown;
	marketing_lines_i18n?: unknown;
};

type AddonCatalogItem = {
	id: string;
	slug: string | null;
	name: string;
};

function planCardLines(plan: Plan): string[] {
	const base: string[] = [];
	const mb = plan.max_branches ?? 0;
	base.push(mb === 1 ? "1 sucursal incluida." : `Hasta ${mb} sucursales.`);
	const mu = plan.max_users ?? 0;
	if (mu > 0) {
		base.push(mu === 1 ? "Hasta 1 usuario." : `Hasta ${mu} usuarios.`);
	}
	const custom = resolvePlanMarketingLines({
		locale: DEFAULT_LOCALE,
		marketingLines: plan.marketing_lines,
		marketingLinesI18n: plan.marketing_lines_i18n,
	});
	return [...base, ...custom];
}

type DescriptionLine = { id: string; text: string };
type LocalizedDescriptionLines = Record<AppLocale, DescriptionLine[]>;
type LocalizedNames = Record<AppLocale, string>;

const LOCALE_LABELS: Record<AppLocale, string> = {
	es: "Español",
	en: "English",
	pt: "Português",
	fr: "Français",
	de: "Deutsch",
	it: "Italiano",
};

function toDescriptionLines(lines: string[]): DescriptionLine[] {
	return normalizeMarketingLines(lines).map((text) => ({ id: newDescriptionLineId(), text }));
}

function localeNamesFromUnknown(fallbackName: string, raw: unknown): LocalizedNames {
	return createLocalizedPlanNameState({ fallbackName, nameI18n: raw });
}

function localeLinesFromUnknown(fallbackLines: string[], raw: unknown): LocalizedDescriptionLines {
	const source = createLocalizedPlanMarketingLinesState({ fallbackLines, marketingLinesI18n: raw });
	const out = {} as LocalizedDescriptionLines;
	for (const locale of SUPPORTED_LOCALES) {
		out[locale] = toDescriptionLines(source[locale] ?? fallbackLines);
	}
	return out;
}

type PriceByContinent = {
	id: string;
	continent: "USA/Canada" | "Latinoamérica" | "Europe" | "Asia" | "Africa" | "Oceania";
	price: string | number;
	currency: string;
};

type PlanFormState = {
	name: string;
	price: string | number;
	pricesByContinent: PriceByContinent[];
	tempPrice: string | number;
	tempCurrency: string;
	tempSelectedRegions: PriceByContinent["continent"][];
	max_branches: string | number;
	max_users: string | number;
	is_public: boolean;
	is_active: boolean;
	ceoTabs: string[];
	baseFeatures: Record<string, unknown>;
	includedAddonTokens: string[];
	blockedAddonTokens: string[];
	allowedAddonTokens: string[];
	descriptionLines: DescriptionLine[];
	nameByLocale: LocalizedNames;
	descriptionLinesByLocale: LocalizedDescriptionLines;
};

const POLICY_INCLUDED_KEYS = ["included_addons", "addons_included", "includes_addons", "plan_addons_included"];
const POLICY_BLOCKED_KEYS = ["blocked_addons", "addons_blocked", "excluded_addons", "plan_addons_blocked"];
const POLICY_ALLOWED_KEYS = ["allowed_addons", "addons_allowed", "plan_addons_allowed"];

function normalizePolicyToken(input: string): string {
	return String(input ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function toPolicyTokens(raw: unknown): string[] {
	if (Array.isArray(raw)) {
		const set = new Set<string>();
		for (const item of raw) {
			const token = normalizePolicyToken(typeof item === "string" ? item : String(item ?? ""));
			if (token) set.add(token);
		}
		return [...set];
	}
	if (typeof raw === "string") {
		const tokens = raw
			.split(/[\n,;|]/g)
			.map((part) => normalizePolicyToken(part))
			.filter(Boolean);
		return [...new Set(tokens)];
	}
	return [];
}

function extractPolicyTokens(features: Record<string, unknown>, keys: string[]): string[] {
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(features, key)) {
			return toPolicyTokens(features[key]);
		}
	}
	return [];
}

function splitBaseAndPolicyFeatures(raw: unknown): {
	baseFeatures: Record<string, unknown>;
	includedAddonTokens: string[];
	blockedAddonTokens: string[];
	allowedAddonTokens: string[];
} {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {
			baseFeatures: {},
			includedAddonTokens: [],
			blockedAddonTokens: [],
			allowedAddonTokens: [],
		};
	}

	const source = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
	const includedAddonTokens = extractPolicyTokens(source, POLICY_INCLUDED_KEYS);
	const blockedAddonTokens = extractPolicyTokens(source, POLICY_BLOCKED_KEYS);
	const allowedAddonTokens = extractPolicyTokens(source, POLICY_ALLOWED_KEYS);

	for (const key of [...POLICY_INCLUDED_KEYS, ...POLICY_BLOCKED_KEYS, ...POLICY_ALLOWED_KEYS]) {
		delete source[key];
	}

	return {
		baseFeatures: source,
		includedAddonTokens,
		blockedAddonTokens,
		allowedAddonTokens,
	};
}

function buildFeaturesPayload(form: PlanFormState): Record<string, unknown> {
	const payload: Record<string, unknown> = {
		...form.baseFeatures,
	};
	if (form.includedAddonTokens.length > 0) payload.included_addons = [...new Set(form.includedAddonTokens)];
	if (form.blockedAddonTokens.length > 0) payload.blocked_addons = [...new Set(form.blockedAddonTokens)];
	if (form.allowedAddonTokens.length > 0) payload.allowed_addons = [...new Set(form.allowedAddonTokens)];
	return payload;
}

const emptyForm = (): PlanFormState => ({
	name: "",
	price: "",
	pricesByContinent: [],
	tempPrice: "",
	tempCurrency: "USD",
	tempSelectedRegions: [],
	max_branches: "",
	max_users: "",
	is_public: true,
	is_active: true,
	ceoTabs: [...DEFAULT_ROLE_NAV_PERMISSIONS.ceo],
	baseFeatures: {},
	includedAddonTokens: [],
	blockedAddonTokens: [],
	allowedAddonTokens: [],
	descriptionLines: [],
	nameByLocale: localeNamesFromUnknown("", {}),
	descriptionLinesByLocale: localeLinesFromUnknown([], {}),
});

export function PlansAdminClient({
	plans,
	rate,
	addons,
}: {
	plans: Plan[];
	rate: number | null;
	addons: AddonCatalogItem[];
}) {
	const router = useRouter();
	const [showNew, setShowNew] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState<PlanFormState>(emptyForm());
	const [listRef] = useAutoAnimate<HTMLDivElement>();

	const clearFormFields = () => {
		setForm(emptyForm());
		setShowNew(false);
		setEditingId(null);
	};

	const resetForm = () => {
		clearFormFields();
	};

	const startNew = () => {
		resetForm();
		setShowNew(true);
	};

	const startEdit = (p: Plan) => {
		const baseName = (p.name ?? "").trim();
		const baseLines = normalizeMarketingLines(p.marketing_lines);
		const ceoTabsByPlan =
			extractCeoTabsFromPlanFeatures(p.features) ?? [...DEFAULT_ROLE_NAV_PERMISSIONS.ceo];
		const baseDescriptionLines = toDescriptionLines(baseLines);
		const localizedLines = localeLinesFromUnknown(baseLines, p.marketing_lines_i18n);
		localizedLines[DEFAULT_LOCALE] = baseDescriptionLines.map((line) => ({ ...line }));
		const pricesByContinent = Object.entries(p.prices_by_continent || {}).flatMap(
			([continent, data]) => {
				if (!data || typeof data.price !== "number" || typeof data.currency !== "string") {
					return [];
				}
				return [
					{
						id: newDescriptionLineId(),
						continent: continent as PriceByContinent["continent"],
						price: data.price,
						currency: data.currency,
					},
				];
			}
		);
		const { baseFeatures, includedAddonTokens, blockedAddonTokens, allowedAddonTokens } = splitBaseAndPolicyFeatures(p.features);
		setForm({
			name: baseName,
			price: p.price ?? "",
			pricesByContinent,
			tempPrice: "",
			tempCurrency: "USD",
			tempSelectedRegions: [],
			max_branches: p.max_branches ?? "",
			max_users: p.max_users ?? "",
			is_public: p.is_public !== false,
			is_active: p.is_active !== false,
			ceoTabs: ceoTabsByPlan,
			baseFeatures,
			includedAddonTokens,
			blockedAddonTokens,
			allowedAddonTokens,
			descriptionLines: baseDescriptionLines,
			nameByLocale: localeNamesFromUnknown(baseName, p.name_i18n),
			descriptionLinesByLocale: localizedLines,
		});
		setEditingId(p.id);
		setShowNew(false);
	};

	const save = async () => {
		const nameTrimmed = form.name.trim();
		if (!nameTrimmed) {
			setError("El nombre del plan es obligatorio.");
			return;
		}
		if (form.pricesByContinent.length === 0) {
			setError("Debes agregar al menos un precio por región.");
			return;
		}
		const maxBranchesNum = form.max_branches === "" ? 1 : Number(form.max_branches);
		const maxUsersNum = form.max_users === "" ? 0 : Number(form.max_users);
		if (Number.isNaN(maxBranchesNum) || maxBranchesNum < 0) {
			setError("Indica un número válido de sucursales.");
			return;
		}
		if (Number.isNaN(maxUsersNum) || maxUsersNum < 0) {
			setError("Indica un número válido de usuarios (0 = sin límite).");
			return;
		}

		const pricesByContinentPayload: Partial<
			Record<PriceByContinent["continent"], { price: number; currency: string }>
		> = {};
		for (const pc of form.pricesByContinent) {
			const normalizedPrice = Number(pc.price);
			if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) continue;
			pricesByContinentPayload[pc.continent] = {
				price: normalizedPrice,
				currency: (pc.currency || "USD").toUpperCase(),
			};
		}
		const latinPrice = pricesByContinentPayload["Latinoamérica"]?.price;
		const fallbackPrice = Object.values(pricesByContinentPayload)[0]?.price ?? 0;

		const payload = {
			name: nameTrimmed,
			price: latinPrice ?? fallbackPrice,
			prices_by_continent: pricesByContinentPayload,
			max_branches: maxBranchesNum,
			max_users: maxUsersNum,
			is_public: form.is_public,
			is_active: form.is_active,
			features: upsertPlanFeaturesCeoTabs(buildFeaturesPayload(form), form.ceoTabs),
			marketing_lines: normalizeMarketingLines(form.descriptionLines.map((l) => l.text)),
			name_i18n: buildPlanNameI18nPayload(form.nameByLocale, nameTrimmed),
			marketing_lines_i18n: buildPlanMarketingLinesI18nPayload(
				Object.fromEntries(
					SUPPORTED_LOCALES.map((locale) => [
						locale,
						normalizeMarketingLines(form.descriptionLinesByLocale[locale].map((line) => line.text)),
					])
				),
				normalizeMarketingLines(form.descriptionLines.map((l) => l.text))
			),
		};

		setSaving(true);
		setError(null);
		try {
			if (editingId) {
				const res = await fetch(`/api/super-admin/plans/${editingId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				const data = (await res.json().catch(() => ({}))) as {
					error?: string;
					detail?: string;
					warning?: string;
				};
				if (!res.ok) {
					const extra = typeof data.detail === "string" ? ` (${data.detail})` : "";
					throw new Error((data.error ?? "Error al guardar") + extra);
				}
				if (typeof data.warning === "string") {
					toast.warning(data.warning);
				} else {
					toast.success("Plan actualizado con éxito.");
				}
			} else {
				const res = await fetch("/api/super-admin/plans", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				const data = (await res.json().catch(() => ({}))) as {
					error?: string;
					detail?: string;
					warning?: string;
				};
				if (!res.ok) {
					const extra = typeof data.detail === "string" ? ` (${data.detail})` : "";
					throw new Error((data.error ?? "Error al crear") + extra);
				}
				if (typeof data.warning === "string") {
					toast.warning(data.warning);
				} else {
					toast.success("Plan creado con éxito.");
				}
			}
			router.refresh();
			clearFormFields();
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : "Error al procesar la solicitud";
			setError(errMsg);
			toast.error(errMsg);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex min-w-0 flex-col gap-4 sm:gap-6">
			<SaasPageHeader
				title="Planes"
				description="Precio, sucursales, usuarios, descripciones extra y visibilidad. Las descripciones van debajo del resumen de sucursales y usuarios en la tarjeta y en la landing."
				icon={Tag}
				action={
					<Button type="button" onClick={startNew} disabled={showNew}>
						Nuevo plan
					</Button>
				}
			/>

			<Drawer
				open={!!(showNew || editingId)}
				onOpenChange={(open: boolean) => { if (!open) resetForm(); }}
				contentClassName="max-w-3xl"
				title={editingId ? "Editar plan" : "Nuevo plan"}
				description="Configura precios, límites, visibilidad y accesos del plan."
			>
				<div className="space-y-4 py-2">
					{error && (
						<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
							{error}
						</div>
					)}
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Nombre</span>
							<Input
								value={form.name}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										name: e.target.value,
										nameByLocale: {
											...p.nameByLocale,
											[DEFAULT_LOCALE]: e.target.value,
										},
									}))
								}
								placeholder="Básico"
								className="h-10"
							/>
						</label>

						<div className="sm:col-span-2">
							<p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
								Descripciones del plan
							</p>
							<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
								Se añaden después del resumen automático (sucursales y usuarios). Escribe el texto y usa
								quitar o añadir otra.
							</p>
							<div className="mt-3 flex flex-col gap-4">
								{form.descriptionLines.map((line, i) => (
									<label key={line.id} className="flex flex-col gap-1 text-sm">
										<span className="font-medium text-zinc-700 dark:text-zinc-300">
											Descripción {i + 1}
										</span>
										<div className="flex gap-2">
											<Textarea
												value={line.text}
												onChange={(e) => {
													const v = e.target.value;
													setForm((prev) => ({
														...prev,
														descriptionLines: prev.descriptionLines.map((row) =>
															row.id === line.id ? { ...row, text: v } : row
															),
															descriptionLinesByLocale: {
																...prev.descriptionLinesByLocale,
																[DEFAULT_LOCALE]: prev.descriptionLinesByLocale[DEFAULT_LOCALE].map((row) =>
																	row.id === line.id ? { ...row, text: v } : row
																),
															},
													}));
												}}
												placeholder="Ej. Incluye menú digital, caja y soporte por chat."
												rows={2}
												className="flex-1"
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="h-10 w-10 shrink-0 self-start p-0"
												onClick={() =>
													setForm((prev) => ({
														...prev,
														descriptionLines: prev.descriptionLines.filter((row) => row.id !== line.id),
															descriptionLinesByLocale: {
																...prev.descriptionLinesByLocale,
																[DEFAULT_LOCALE]: prev.descriptionLinesByLocale[DEFAULT_LOCALE].filter((row) => row.id !== line.id),
															},
													}))
												}
												aria-label={`Quitar descripción ${i + 1}`}
											>
												<Trash2 className="h-4 w-4" aria-hidden />
											</Button>
										</div>
									</label>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-fit gap-1.5"
									onClick={() =>
										setForm((prev) => ({
											...(() => {
												const newLine = { id: newDescriptionLineId(), text: "" };
												return {
													...prev,
													descriptionLinesByLocale: {
														...prev.descriptionLinesByLocale,
														[DEFAULT_LOCALE]: [
															...prev.descriptionLinesByLocale[DEFAULT_LOCALE],
															{ ...newLine },
														],
													},
													descriptionLines: [...prev.descriptionLines, newLine],
												};
											})(),
										}))
									}
								>
									<Plus className="h-4 w-4" aria-hidden />
									Añadir descripción
								</Button>
							</div>
						</div>

						<details className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
							<summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800 dark:text-zinc-200">
								Traducciones por idioma
							</summary>
							<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
								Edita cada idioma en este bloque plegable. Si dejas algo vacío, se usa fallback automático.
							</p>
							<div className="mt-4 grid gap-4">
								{SUPPORTED_LOCALES.map((locale) => (
									<div key={locale} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
										<p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
											{LOCALE_LABELS[locale]} ({locale})
										</p>
										<label className="mt-2 flex flex-col gap-1 text-sm">
											<span className="font-medium text-zinc-700 dark:text-zinc-300">Nombre</span>
											<Input
												value={form.nameByLocale[locale] ?? ""}
												onChange={(e) =>
													setForm((prev) => ({
														...prev,
														...(locale === DEFAULT_LOCALE ? { name: e.target.value } : {}),
														nameByLocale: {
															...prev.nameByLocale,
															[locale]: e.target.value,
														},
													}))
												}
												placeholder={`Nombre en ${LOCALE_LABELS[locale]}`}
												className="h-10"
											/>
										</label>

										<div className="mt-2 flex flex-col gap-3">
											<p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Descripciones</p>
											{form.descriptionLinesByLocale[locale].map((line, i) => (
												<div key={line.id} className="flex gap-2">
													<Textarea
														value={line.text}
														onChange={(e) => {
															const value = e.target.value;
															setForm((prev) => ({
																...prev,
																...(locale === DEFAULT_LOCALE
																	? {
																		descriptionLines: prev.descriptionLines.map((row) =>
																			row.id === line.id ? { ...row, text: value } : row
																		),
																	}
																	: {}),
																descriptionLinesByLocale: {
																	...prev.descriptionLinesByLocale,
																	[locale]: prev.descriptionLinesByLocale[locale].map((row) =>
																		row.id === line.id ? { ...row, text: value } : row
																	),
																},
															}));
														}}
														rows={2}
														placeholder={`Descripcion ${i + 1} en ${LOCALE_LABELS[locale]}`}
														className="flex-1"
													/>
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="h-10 w-10 shrink-0 p-0"
														onClick={() =>
															setForm((prev) => ({
																...prev,
																...(locale === DEFAULT_LOCALE
																	? {
																		descriptionLines: prev.descriptionLines.filter((row) => row.id !== line.id),
																	}
																	: {}),
																descriptionLinesByLocale: {
																	...prev.descriptionLinesByLocale,
																	[locale]: prev.descriptionLinesByLocale[locale].filter((row) => row.id !== line.id),
																},
															}))
														}
														aria-label={`Quitar descripcion ${i + 1} de ${locale}`}
													>
														<Trash2 className="h-4 w-4" aria-hidden />
													</Button>
												</div>
											))}
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="w-fit gap-1.5"
												onClick={() =>
													setForm((prev) => ({
														...(() => {
															const newLine = { id: newDescriptionLineId(), text: "" };
															return {
																...prev,
																...(locale === DEFAULT_LOCALE
																	? {
																		descriptionLines: [...prev.descriptionLines, newLine],
																	}
																	: {}),
																descriptionLinesByLocale: {
																	...prev.descriptionLinesByLocale,
																	[locale]: [...prev.descriptionLinesByLocale[locale], newLine],
																},
															};
														})(),
													}))
												}
											>
												<Plus className="h-4 w-4" aria-hidden />
												Añadir descripcion en {LOCALE_LABELS[locale]}
											</Button>
										</div>
									</div>
								))}
							</div>
						</details>

						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Max sucursales</span>
							<Input
								type="number"
								min="0"
								value={form.max_branches === "" ? "" : form.max_branches}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										max_branches: e.target.value === "" ? "" : Number(e.target.value),
									}))
								}
								placeholder="1"
								className="h-10"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium text-zinc-700 dark:text-zinc-300">Max usuarios</span>
							<Input
								type="number"
								min="0"
								value={form.max_users === "" ? "" : form.max_users}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										max_users: e.target.value === "" ? "" : Number(e.target.value),
									}))
								}
								placeholder="0 = no mostrar en copy"
								className="h-10"
							/>
							<span className="text-xs font-normal text-zinc-500">
								En landing: si es 0 no se añade línea de usuarios; si es mayor, muestra el tope.
							</span>
						</label>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<SaasSwitch
								checked={form.is_public}
								onChange={(checked) => setForm((p) => ({ ...p, is_public: checked }))}
								label="Visible en registro y landing"
							/>
							<SaasSwitch
								checked={form.is_active}
								onChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
								label="Plan activo"
							/>
						</div>

						<div className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
							<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Politica de extras del plan</p>
							<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
								Configura que extras aparecen como incluidos, bloqueados o permitidos para este plan.
							</p>

							<div className="mt-3 grid gap-3 lg:grid-cols-3">
								<div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
									<p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Incluidos</p>
									<div className="mt-2 space-y-2">
									{addons.map((addon) => {
										const token = normalizePolicyToken(addon.slug || addon.name);
										const checked = form.includedAddonTokens.includes(token);
										return (
											<SaasCheckbox
												key={`inc-${addon.id}`}
												checked={checked}
												onChange={(checked) =>
													setForm((prev) => ({
														...prev,
														includedAddonTokens: checked
															? [...new Set([...prev.includedAddonTokens, token])]
															: prev.includedAddonTokens.filter((t) => t !== token),
													}))
												}
												label={addon.name}
											/>
										);
									})}
									</div>
								</div>

								<div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
									<p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Bloqueados</p>
									<div className="mt-2 space-y-2">
									{addons.map((addon) => {
										const token = normalizePolicyToken(addon.slug || addon.name);
										const checked = form.blockedAddonTokens.includes(token);
										return (
											<SaasCheckbox
												key={`blk-${addon.id}`}
												checked={checked}
												onChange={(checked) =>
													setForm((prev) => ({
														...prev,
														blockedAddonTokens: checked
															? [...new Set([...prev.blockedAddonTokens, token])]
															: prev.blockedAddonTokens.filter((t) => t !== token),
													}))
												}
												label={addon.name}
											/>
										);
									})}
									</div>
								</div>

								<div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
									<p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Permitidos</p>
									<p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
										Si dejas esta lista vacia, el plan permite todos excepto los bloqueados.
									</p>
									<div className="mt-2 space-y-2">
									{addons.map((addon) => {
										const token = normalizePolicyToken(addon.slug || addon.name);
										const checked = form.allowedAddonTokens.includes(token);
										return (
											<SaasCheckbox
												key={`allow-${addon.id}`}
												checked={checked}
												onChange={(checked) =>
													setForm((prev) => ({
														...prev,
														allowedAddonTokens: checked
															? [...new Set([...prev.allowedAddonTokens, token])]
															: prev.allowedAddonTokens.filter((t) => t !== token),
													}))
												}
												label={addon.name}
											/>
										);
									})}
									</div>
								</div>
							</div>

							<div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
								<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
									Accesos del panel de la empresa por membresía
								</p>
								<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
									Selecciona las pestañas que tendrá activa la empresa cuando use este plan.
								</p>
								<div className="mt-3 grid gap-2 sm:grid-cols-2">
									{TENANT_ADMIN_TAB_OPTIONS.map((tab) => {
										const checked = form.ceoTabs.includes(tab.id);
										return (
											<SaasCheckbox
												key={tab.id}
												checked={checked}
												onChange={(checked) =>
													setForm((prev) => ({
														...prev,
														ceoTabs: checked
															? [...prev.ceoTabs, tab.id]
															: prev.ceoTabs.filter((id) => id !== tab.id),
													}))
												}
												label={tab.label}
											/>
										);
									})}
								</div>
							</div>
						</div>
						</div>
					{/* Precios por región */}
					<div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
						<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Precios por región</p>
						<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
							Ingresa el precio, selecciona las regiones y aplica a todas de una vez.
						</p>

						{/* Formulario para agregar múltiples precios */}
						<div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-zinc-900/50">
							<div className="grid gap-3 sm:grid-cols-2">
								<label className="flex flex-col gap-1 text-sm">
									<span className="font-medium text-zinc-700 dark:text-zinc-300">Precio</span>
									<input
										type="number"
										min="0"
										placeholder="20"
										value={form.tempPrice === "" ? "" : form.tempPrice}
										onChange={(e) =>
											setForm((p) => ({
												...p,
												tempPrice: e.target.value === "" ? "" : Number(e.target.value),
											}))
										}
										className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
									/>
								</label>
								<label className="flex flex-col gap-1 text-sm">
									<span className="font-medium text-zinc-700 dark:text-zinc-300">Moneda</span>
									<input
										type="text"
										placeholder="USD"
										maxLength={3}
										value={form.tempCurrency}
										onChange={(e) =>
											setForm((p) => ({
												...p,
												tempCurrency: e.target.value.toUpperCase(),
											}))
										}
										className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-center text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
									/>
								</label>
							</div>

							<div className="sm:col-span-2">
								<p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Aplicar a estas regiones:</p>
								<div className="grid gap-2 sm:grid-cols-2">
									{["USA/Canada", "Latinoamérica", "Europe", "Asia", "Africa", "Oceania"].map((region) => (
										<SaasCheckbox
											key={region}
											checked={form.tempSelectedRegions.includes(region as PriceByContinent["continent"])}
											onChange={(checked) => {
												const continent = region as PriceByContinent["continent"];
												setForm((p) => ({
													...p,
													tempSelectedRegions: checked
														? [...p.tempSelectedRegions, continent]
														: p.tempSelectedRegions.filter((c: PriceByContinent["continent"]) => c !== continent),
												}));
											}}
											label={region}
										/>
									))}
								</div>
							</div>

							<Button
								type="button"
								variant="outline"
								size="sm"
								className="w-full gap-1.5"
								onClick={() => {
									const price = Number(form.tempPrice);
									if (Number.isNaN(price) || price < 0 || form.tempSelectedRegions.length === 0) {
										setError("Ingresa precio válido y selecciona al menos una región.");
										return;
									}
									setError(null);

									const newPrices = form.tempSelectedRegions.map((continent: PriceByContinent["continent"]) => ({
										id: newDescriptionLineId(),
										continent,
										price,
										currency: form.tempCurrency,
									}));

									setForm((p) => ({
										...p,
										pricesByContinent: [...p.pricesByContinent, ...newPrices],
										tempPrice: "",
										tempCurrency: "USD",
										tempSelectedRegions: [],
									}));
								}}
							>
								<Plus className="h-4 w-4" aria-hidden />
								Aplicar precio a {form.tempSelectedRegions.length} región{form.tempSelectedRegions.length !== 1 ? "es" : ""}
							</Button>
						</div>

						{/* Tabla de precios ya agregados */}
						{form.pricesByContinent.length > 0 && (
							<div className="mt-4 space-y-2">
								<p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Precios configurados:</p>
								{form.pricesByContinent.map((pc: PriceByContinent, idx: number) => (
									<div key={pc.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
										<div className="flex gap-4 items-center">
											<span className="font-medium text-zinc-900 dark:text-zinc-100">{pc.continent}</span>
											<span className="text-sm text-zinc-600 dark:text-zinc-400">{pc.currency} {pc.price}</span>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="h-8 w-8 p-0"
											onClick={() => {
												setForm((prev) => ({
													...prev,
													pricesByContinent: prev.pricesByContinent.filter((_: PriceByContinent, i: number) => i !== idx),
												}));
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="mt-6 flex gap-2 pb-6">
						<Button type="button" onClick={save} disabled={saving}>
							{saving ? "Guardando…" : editingId ? "Guardar" : "Crear"}
						</Button>
						<Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
							Cancelar
						</Button>
					</div>
				</div>
			</Drawer>

			<div ref={listRef} className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{plans.map((plan) => {
					const latinPrice = plan.prices_by_continent?.["Latinoamérica"];
					const priceData = latinPrice || Object.values(plan.prices_by_continent || {}).find(Boolean);

					return (
						<Card
							key={plan.id}
							className={`flex min-w-0 flex-col gap-4 rounded-3xl border bg-white p-4 dark:bg-zinc-900/80 sm:p-5 ${
								plan.is_public
									? "border-indigo-200/60 dark:border-indigo-800/40"
									: "border-zinc-200/60 dark:border-zinc-800/60"
							}`}
						>
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
										{plan.name ?? "Sin nombre"}
									</p>
									<Button type="button" variant="outline" size="sm" onClick={() => startEdit(plan)}>
										Editar
									</Button>
								</div>
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
										{priceData ? currency.format(priceData.price) : "Precio no configurado"} / mes
									</h3>
									{plan.is_public === false && <SaasStatusBadge label="Solo interno" variant="neutral" />}
									{plan.is_active === false && <SaasStatusBadge label="Inactivo" variant="warning" />}
									{rate && priceData && (
										<span className="text-xs text-zinc-500 dark:text-zinc-400">
											{clpCurrency.format(priceData.price * rate)} aprox
										</span>
									)}
								</div>
							</div>
							<div className="flex flex-col gap-3">
								<ul className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400">
									{planCardLines(plan).map((line, i) => (
										<li key={`${plan.id}-${i}`} className="whitespace-pre-wrap">
											{line}
										</li>
									))}
								</ul>
							</div>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
