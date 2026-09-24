"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
	Ban,
	Check,
	CheckCircle2,
	ChevronDown,
	ListChecks,
	Pencil,
	Plus,
	Store,
	Tag,
	Trash2,
	Users,
	type LucideIcon,
} from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Drawer } from "@/components/ui/drawer";
import { toast } from "sonner";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { SaasCheckbox } from "@/components/super-admin/shared/saas-checkbox";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { SaasEmptyState } from "@/components/super-admin/shared/saas-empty-state";
import { cn } from "@/utils/cn";
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

/** Resumen automático de la tarjeta (sucursales y usuarios); con 0 usuarios no se muestra, igual que en la landing. */
function planSummary(plan: Plan): { branches: string; users: string | null } {
	const mb = plan.max_branches ?? 0;
	const mu = plan.max_users ?? 0;
	return {
		branches: mb === 1 ? "1 sucursal incluida" : `Hasta ${mb} sucursales`,
		users: mu > 0 ? (mu === 1 ? "Hasta 1 usuario" : `Hasta ${mu} usuarios`) : null,
	};
}

/** Descripciones extra del plan en el idioma por defecto (van debajo del resumen). */
function planFeatureLines(plan: Plan): string[] {
	return resolvePlanMarketingLines({
		locale: DEFAULT_LOCALE,
		marketingLines: plan.marketing_lines,
		marketingLinesI18n: plan.marketing_lines_i18n,
	});
}

/* Botones, campos y textos con el mismo formato que el Inicio. */
const PRIMARY_BUTTON =
	"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";
const SECONDARY_BUTTON =
	"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-zinc-50";
const ICON_BUTTON =
	"inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:bg-zinc-800 dark:hover:text-red-400";
const FIELD_CLASS =
	"h-9 rounded-lg border-zinc-200 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700";
const NATIVE_FIELD_CLASS =
	"h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const TEXTAREA_CLASS =
	"min-h-16 flex-1 rounded-lg border-zinc-200 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700";
const LABEL_CLASS = "text-[13px] font-medium text-zinc-700 dark:text-zinc-300";
const HELPER_CLASS = "text-[11px] text-zinc-400 dark:text-zinc-500";

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

/** Las claves son las de `plans.prices_by_continent` (no se traducen); esto es solo lo que se muestra. */
const REGION_LABELS: Record<string, string> = {
	"USA/Canada": "EE. UU. y Canadá",
	"Latinoamérica": "Latinoamérica",
	Europe: "Europa",
	Asia: "Asia",
	Africa: "África",
	Oceania: "Oceanía",
};

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
		<div className="flex min-w-0 flex-col gap-6">
			<SaasPageHeader
				title="Planes"
				description="Precio, sucursales, usuarios, descripciones extra y visibilidad. Las descripciones van debajo del resumen de sucursales y usuarios en la tarjeta y en la landing."
				action={
					<button type="button" onClick={startNew} disabled={showNew} className={PRIMARY_BUTTON}>
						<Plus className="h-3.5 w-3.5" aria-hidden />
						Nuevo plan
					</button>
				}
			/>

			<Drawer
				open={!!(showNew || editingId)}
				onOpenChange={(open: boolean) => { if (!open) resetForm(); }}
				contentClassName="max-w-3xl"
				title={editingId ? "Editar plan" : "Nuevo plan"}
				description="Configura precios, límites, visibilidad y accesos del plan."
			>
				<div className="space-y-4 pt-2">
					{error && (
						<div
							role="alert"
							className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
						>
							{error}
						</div>
					)}

					{/* Datos generales: nombre, límites y visibilidad */}
					<FormSection title="General">
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="flex flex-col gap-1.5 sm:col-span-2">
								<span className={LABEL_CLASS}>Nombre</span>
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
									className={FIELD_CLASS}
								/>
							</label>
							<label className="flex flex-col gap-1.5">
								<span className={LABEL_CLASS}>Máx. sucursales</span>
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
									className={cn(FIELD_CLASS, "tabular-nums")}
								/>
							</label>
							<label className="flex flex-col gap-1.5">
								<span className={LABEL_CLASS}>Máx. usuarios</span>
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
									className={cn(FIELD_CLASS, "tabular-nums")}
								/>
								<span className={HELPER_CLASS}>
									En landing: si es 0 no se añade línea de usuarios; si es mayor, muestra el tope.
								</span>
							</label>
							<div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
								<div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
									<SaasSwitch
										checked={form.is_public}
										onChange={(checked) => setForm((p) => ({ ...p, is_public: checked }))}
										label="Visible en registro y landing"
									/>
								</div>
								<div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
									<SaasSwitch
										checked={form.is_active}
										onChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
										label="Plan activo"
									/>
								</div>
							</div>
						</div>
					</FormSection>

					<FormSection
						title="Descripciones del plan"
						description="Se añaden después del resumen automático (sucursales y usuarios). Escribe el texto y usa quitar o añadir otra."
					>
						<div className="flex flex-col gap-3">
							{form.descriptionLines.map((line, i) => (
								<label key={line.id} className="flex flex-col gap-1.5">
									<span className={LABEL_CLASS}>Descripción {i + 1}</span>
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
											className={TEXTAREA_CLASS}
										/>
										<button
											type="button"
											className={cn(ICON_BUTTON, "self-start")}
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
										</button>
									</div>
								</label>
							))}
							<button
								type="button"
								className={cn(SECONDARY_BUTTON, "w-fit")}
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
								<Plus className="h-3.5 w-3.5" aria-hidden />
								Añadir descripción
							</button>
						</div>
					</FormSection>

					<details className="group rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 [&::-webkit-details-marker]:hidden">
							<span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Traducciones por idioma</span>
							<ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden />
						</summary>
						<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
							Edita cada idioma en este bloque plegable. Si dejas algo vacío, se usa fallback automático.
						</p>
						<div className="mt-4 grid gap-3">
							{SUPPORTED_LOCALES.map((locale) => (
								<div key={locale} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
									<p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
										{LOCALE_LABELS[locale]} <span className="font-normal text-zinc-400">({locale})</span>
									</p>
									<label className="mt-3 flex flex-col gap-1.5">
										<span className={LABEL_CLASS}>Nombre</span>
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
											className={FIELD_CLASS}
										/>
									</label>

									<div className="mt-3 flex flex-col gap-2">
										<p className={LABEL_CLASS}>Descripciones</p>
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
													placeholder={`Descripción ${i + 1} en ${LOCALE_LABELS[locale]}`}
													className={TEXTAREA_CLASS}
												/>
												<button
													type="button"
													className={ICON_BUTTON}
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
													aria-label={`Quitar descripción ${i + 1} de ${locale}`}
												>
													<Trash2 className="h-4 w-4" aria-hidden />
												</button>
											</div>
										))}
										<button
											type="button"
											className={cn(SECONDARY_BUTTON, "w-fit")}
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
											<Plus className="h-3.5 w-3.5" aria-hidden />
											Añadir descripción en {LOCALE_LABELS[locale]}
										</button>
									</div>
								</div>
							))}
						</div>
					</details>

					<FormSection
						title="Política de extras del plan"
						description="Configura qué extras aparecen como incluidos, bloqueados o permitidos para este plan."
					>
						<div className="grid gap-3 lg:grid-cols-3">
							<PolicyBox
								title="Incluidos"
								icon={CheckCircle2}
								iconClassName="text-emerald-600 dark:text-emerald-400"
								count={form.includedAddonTokens.length}
							>
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
							</PolicyBox>

							<PolicyBox
								title="Bloqueados"
								icon={Ban}
								iconClassName="text-red-500 dark:text-red-400"
								count={form.blockedAddonTokens.length}
							>
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
							</PolicyBox>

							<PolicyBox
								title="Permitidos"
								icon={ListChecks}
								iconClassName="text-zinc-400"
								count={form.allowedAddonTokens.length}
								hint="Si dejas esta lista vacía, el plan permite todos excepto los bloqueados."
							>
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
							</PolicyBox>
						</div>
					</FormSection>

					<FormSection
						title="Accesos del panel de la empresa por membresía"
						description="Selecciona las pestañas que tendrá activa la empresa cuando use este plan."
					>
						<div className="grid gap-2.5 sm:grid-cols-2">
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
					</FormSection>

					{/* Precios por región */}
					<FormSection
						title="Precios por región"
						description="Ingresa el precio, selecciona las regiones y aplica a todas de una vez."
					>
						{/* Formulario para agregar múltiples precios */}
						<div className="space-y-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
							<div className="grid gap-3 sm:grid-cols-2">
								<label className="flex flex-col gap-1.5">
									<span className={LABEL_CLASS}>Precio</span>
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
										className={cn(NATIVE_FIELD_CLASS, "tabular-nums")}
									/>
								</label>
								<label className="flex flex-col gap-1.5">
									<span className={LABEL_CLASS}>Moneda</span>
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
										className={NATIVE_FIELD_CLASS}
									/>
								</label>
							</div>

							<div>
								<p className={cn(LABEL_CLASS, "mb-2")}>Aplicar a estas regiones</p>
								<div className="grid gap-2.5 sm:grid-cols-2">
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
											label={REGION_LABELS[region] ?? region}
										/>
									))}
								</div>
							</div>

							<button
								type="button"
								className={cn(SECONDARY_BUTTON, "w-full")}
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
								<Plus className="h-3.5 w-3.5" aria-hidden />
								Aplicar precio a {form.tempSelectedRegions.length} región{form.tempSelectedRegions.length !== 1 ? "es" : ""}
							</button>
						</div>

						{/* Tabla de precios ya agregados */}
						{form.pricesByContinent.length > 0 && (
							<div className="mt-4">
								<p className={cn(LABEL_CLASS, "mb-2")}>Precios configurados</p>
								<ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
									{form.pricesByContinent.map((pc: PriceByContinent, idx: number) => (
										<li key={pc.id} className="flex items-center justify-between gap-3 py-1.5 pl-3 pr-1.5">
											<div className="flex min-w-0 items-center gap-3">
												<span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{REGION_LABELS[pc.continent] ?? pc.continent}</span>
												<span className="text-[13px] tabular-nums text-zinc-500 dark:text-zinc-400">{pc.currency} {pc.price}</span>
											</div>
											<button
												type="button"
												className={cn(ICON_BUTTON, "h-8 w-8")}
												onClick={() => {
													setForm((prev) => ({
														...prev,
														pricesByContinent: prev.pricesByContinent.filter((_: PriceByContinent, i: number) => i !== idx),
													}));
												}}
												aria-label={`Quitar precio de ${REGION_LABELS[pc.continent] ?? pc.continent}`}
											>
												<Trash2 className="h-4 w-4" aria-hidden />
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</FormSection>

					{/* Acciones fijas al pie del panel para no tener que bajar hasta el final */}
					<div className="sticky bottom-0 flex gap-2 border-t border-zinc-100 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-950">
						<button type="button" onClick={save} disabled={saving} className={PRIMARY_BUTTON}>
							{saving ? "Guardando…" : editingId ? "Guardar" : "Crear"}
						</button>
						<button type="button" onClick={resetForm} disabled={saving} className={SECONDARY_BUTTON}>
							Cancelar
						</button>
					</div>
				</div>
			</Drawer>

			{plans.length === 0 ? (
				<SaasEmptyState
					icon={Tag}
					title="Aún no hay planes"
					description="Crea el primero con «Nuevo plan»."
				/>
			) : null}

			<div ref={listRef} className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{plans.map((plan) => (
					<PlanCard key={plan.id} plan={plan} rate={rate} onEdit={startEdit} />
				))}
			</div>
		</div>
	);
}

/** Bloque del formulario del plan: mismo borde y títulos que las tarjetas del Inicio. */
function FormSection({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
			<h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
			{description ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p> : null}
			<div className="mt-4">{children}</div>
		</section>
	);
}

/** Columna de la política de extras. El color queda solo en el icono. */
function PolicyBox({
	title,
	icon: Icon,
	iconClassName,
	count,
	hint,
	children,
}: {
	title: string;
	icon: LucideIcon;
	iconClassName: string;
	count: number;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
			<div className="flex items-center justify-between gap-2">
				<p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
					<Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName)} aria-hidden />
					{title}
				</p>
				<span className="text-[11px] tabular-nums text-zinc-400" aria-label={`${count} seleccionados`}>
					{count}
				</span>
			</div>
			{hint ? <p className={cn(HELPER_CLASS, "mt-1")}>{hint}</p> : null}
			<div className="mt-3 space-y-2">{children}</div>
		</div>
	);
}

/** Descripciones visibles antes de "Ver más": así las tarjetas quedan parejas en la grilla. */
const VISIBLE_FEATURES = 4;

/** Una línea larga (o con saltos) se corta a dos líneas en la vista compacta. */
function isLongFeatureLine(line: string): boolean {
	return line.length > 90 || line.includes("\n");
}

function PlanCard({ plan, rate, onEdit }: { plan: Plan; rate: number | null; onEdit: (plan: Plan) => void }) {
	const [expanded, setExpanded] = useState(false);
	const listId = useId();
	const latinPrice = plan.prices_by_continent?.["Latinoamérica"];
	const priceData = latinPrice || Object.values(plan.prices_by_continent || {}).find(Boolean);
	const name = plan.name ?? "Sin nombre";
	const summary = planSummary(plan);
	const features = planFeatureLines(plan);
	const hiddenCount = Math.max(0, features.length - VISIBLE_FEATURES);
	const canExpand = hiddenCount > 0 || features.slice(0, VISIBLE_FEATURES).some(isLongFeatureLine);
	const shown = expanded ? features : features.slice(0, VISIBLE_FEATURES);

	return (
		<article className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50" title={name}>
						{name}
					</h3>
					{plan.is_public === false || plan.is_active === false ? (
						<div className="mt-1.5 flex flex-wrap gap-1.5">
							{plan.is_public === false && <SaasStatusBadge label="Solo interno" variant="neutral" />}
							{plan.is_active === false && <SaasStatusBadge label="Inactivo" variant="warning" />}
						</div>
					) : null}
				</div>
				<button type="button" onClick={() => onEdit(plan)} className={SECONDARY_BUTTON} aria-label={`Editar ${name}`}>
					<Pencil className="h-3.5 w-3.5" aria-hidden />
					Editar
				</button>
			</div>

			<div className="mt-4">
				{priceData ? (
					<p className="flex items-baseline gap-1">
						<span className="text-xl font-semibold tabular-nums leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
							{currency.format(priceData.price)}
						</span>
						<span className="text-xs text-zinc-500 dark:text-zinc-400">/ mes</span>
					</p>
				) : (
					<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Precio no configurado</p>
				)}
				{rate && priceData ? (
					<p className="mt-1 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
						≈ {clpCurrency.format(priceData.price * rate)} CLP
					</p>
				) : null}
			</div>

			<p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
				<span className="inline-flex items-center gap-1">
					<Store className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} aria-hidden />
					{summary.branches}
				</span>
				{summary.users ? (
					<span className="inline-flex items-center gap-1">
						<Users className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} aria-hidden />
						{summary.users}
					</span>
				) : null}
			</p>

			{features.length > 0 ? (
				<div className="mt-4 flex flex-1 flex-col border-t border-zinc-100 pt-4 dark:border-zinc-800">
					<ul id={listId} className="space-y-2">
						{shown.map((line, i) => (
							<li key={`${plan.id}-${i}`} className="flex gap-2 text-[13px] leading-snug text-zinc-600 dark:text-zinc-300">
								<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
								<span className={cn("min-w-0 whitespace-pre-wrap break-words", !expanded && "line-clamp-2")}>{line}</span>
							</li>
						))}
					</ul>
					{canExpand ? (
						<div className="mt-auto pt-3">
							<button
								type="button"
								onClick={() => setExpanded((v) => !v)}
								aria-expanded={expanded}
								aria-controls={listId}
								className="inline-flex items-center gap-1 rounded text-xs font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:text-zinc-400 dark:hover:text-zinc-100"
							>
								{expanded ? "Ver menos" : hiddenCount > 0 ? `Ver ${hiddenCount} más` : "Ver completo"}
								<ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} aria-hidden />
							</button>
						</div>
					) : null}
				</div>
			) : null}
		</article>
	);
}
