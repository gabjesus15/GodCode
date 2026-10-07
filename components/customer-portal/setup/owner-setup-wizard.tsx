"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Smartphone, X } from "lucide-react";

import { AccountMenuTab, type MenuStatus } from "../account/tabs/account-menu-tab";
import type { StoreThemeConfig } from "../shared/customer-account-types";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

import type { OwnerSetupInitial } from "./owner-setup-types";
import { SetupPreview } from "./setup-preview";
import { BrandStep } from "./steps/brand-step";
import { DesignStep } from "./steps/design-step";
import { LocalStep, type LocalForm } from "./steps/local-step";
import { PublishStep } from "./steps/publish-step";

import { applyMenuTemplate, findMenuTemplate } from "@/lib/store-theme/menu-templates";
import { diffStoreTheme, validateStoreThemeAssetFile } from "@/lib/store-theme/store-theme-utils";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { businessHoursWeekFromScheduleText, hasAnyBusinessHours } from "@/lib/tenant/business-hours";
import { socialInputToUrl } from "@/lib/tenant/home-page/home-page-config";
import { brandButtonColors } from "@/lib/tenant/logo-colors";
import { OWNER_SETUP_STEPS, type OwnerSetupStep } from "@/lib/tenant/owner-setup";
import { phoneFromWhatsappUrl, whatsappUrlFromPhone } from "@/lib/tenant/whatsapp-url";

const STEP_LABEL: Record<OwnerSetupStep, string> = {
	marca: "Tu marca",
	diseno: "Diseño",
	menu: "Tu menú",
	local: "Datos del local",
	publicar: "Publicar",
};

function instagramHandle(url: string | null): string {
	const match = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(url ?? "");
	return match ? `@${match[1]}` : (url ?? "");
}

function initialLocalForm(initial: OwnerSetupInitial): LocalForm {
	const branch = initial.branch;
	const stored = branch?.businessHours ?? null;
	const hasStored = hasAnyBusinessHours(stored);
	const legacyWeek = hasStored ? null : businessHoursWeekFromScheduleText(branch?.schedule);
	return {
		whatsapp: phoneFromWhatsappUrl(branch?.whatsappUrl),
		instagram: instagramHandle(branch?.instagramUrl ?? null),
		address: branch?.address ?? "",
		hoursWeek: hasStored ? stored!.week : legacyWeek!,
		hoursEnabled: hasStored ? stored!.enabled : true,
		hoursStored: hasStored,
		legacySchedule: branch?.schedule?.trim() || null,
		legacyParsed: legacyWeek != null && Object.values(legacyWeek).some((intervals) => intervals.length > 0),
		timeZone: stored?.timezone ?? null,
	};
}

type ThemeSaveResponse = { error?: string; draft?: { theme?: StoreThemeConfig } };

export function OwnerSetupWizard({ initial, initialStep }: { initial: OwnerSetupInitial; initialStep: OwnerSetupStep }) {
	const router = useRouter();
	const [step, setStep] = useState<OwnerSetupStep>(initialStep);
	const [theme, setTheme] = useState<StoreThemeConfig>(initial.theme);
	const [displayName, setDisplayName] = useState(initial.theme.displayName || initial.company.name);
	const [pickedTemplateId, setPickedTemplateId] = useState<string | null>(null);
	// Si ya había elegido un color de marca (el botón no es el de la plantilla), se conserva al
	// cambiar de diseño; si no, el paso 1 propone el del logo.
	const [brandColor, setBrandColor] = useState<string | null | undefined>(() => {
		const template = findMenuTemplate(initial.theme.templateId);
		return template && template.theme.primaryColor !== initial.theme.primaryColor ? initial.theme.primaryColor : undefined;
	});
	const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(initial.logoPreviewUrl);
	const logoBlobUrl = useRef<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [menuStatus, setMenuStatus] = useState<MenuStatus>(initial.menuSetup);
	const [reloadKey, setReloadKey] = useState(0);
	const [local, setLocal] = useState<LocalForm>(() => initialLocalForm(initial));
	const [localDirty, setLocalDirty] = useState(false);
	const [whatsappError, setWhatsappError] = useState<string | null>(null);
	const [busy, setBusy] = useState<"save" | "skip" | "publish" | "finish" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [published, setPublished] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);

	useEffect(
		() => () => {
			if (logoBlobUrl.current) URL.revokeObjectURL(logoBlobUrl.current);
		},
		[],
	);

	/** Lo que se ve: el borrador con la plantilla elegida y el color de la marca encima. */
	const effectiveTheme = useMemo(() => {
		let next: StoreThemeConfig = { ...theme, displayName: displayName.trim() || theme.displayName };
		if (pickedTemplateId) next = applyMenuTemplate(next, pickedTemplateId);
		if (brandColor) {
			const buttons = brandButtonColors(brandColor);
			if (buttons) next = { ...next, ...buttons };
		} else if (brandColor === null) {
			const template = findMenuTemplate(next.templateId);
			if (template?.theme.primaryColor) {
				next = { ...next, primaryColor: template.theme.primaryColor, hoverColor: template.theme.hoverColor ?? next.hoverColor };
			}
		}
		return next;
	}, [theme, displayName, pickedTemplateId, brandColor]);

	const previewTheme = useMemo(
		() => ({ ...effectiveTheme, logoUrl: logoPreviewUrl || effectiveTheme.logoUrl }),
		[effectiveTheme, logoPreviewUrl],
	);

	const stepIndex = OWNER_SETUP_STEPS.indexOf(step);
	const realProducts = Math.max(0, menuStatus.productCount - menuStatus.sampleCount);
	const savedWhatsapp = whatsappUrlFromPhone(local.whatsapp, initial.company.country);
	const stepDone: Record<OwnerSetupStep, boolean> = {
		marca: Boolean(theme.logoUrl.trim()),
		diseno: Boolean(effectiveTheme.templateId),
		menu: menuStatus.productCount > 0,
		local: Boolean(savedWhatsapp && local.address.trim()),
		publicar: published,
	};

	async function saveTheme(): Promise<boolean> {
		const patch: Partial<StoreThemeConfig> = diffStoreTheme(effectiveTheme, theme);
		delete patch.logoUrl;
		if (Object.keys(patch).length === 0) return true;
		const res = await fetch("/api/customer-account/store-theme", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ patch }),
		});
		const data = (await res.json().catch(() => ({}))) as ThemeSaveResponse;
		if (!res.ok || !data.draft?.theme) {
			setError(data.error || "No pudimos guardar el diseño. Intenta de nuevo.");
			return false;
		}
		setTheme(normalizeStoreThemeConfig(data.draft.theme));
		return true;
	}

	async function saveLocal(): Promise<boolean> {
		if (!localDirty || !initial.branch) return true;
		const whatsappUrl = whatsappUrlFromPhone(local.whatsapp, initial.company.country);
		if (local.whatsapp.trim() && !whatsappUrl) {
			const example = /venezuela|^ve$/i.test(initial.company.country ?? "") ? "+58 412…" : "+56 9…";
			setWhatsappError(`Escribe el número completo, con el código de país (por ejemplo ${example}).`);
			return false;
		}
		setWhatsappError(null);
		const body: Record<string, unknown> = {
			id: initial.branch.id,
			whatsapp_url: whatsappUrl ?? "",
			instagram_url: local.instagram.trim() ? socialInputToUrl("instagram", local.instagram) : "",
			address: local.address,
		};
		const anyHours = Object.values(local.hoursWeek).some((intervals) => intervals.length > 0);
		if (anyHours) body.business_hours = { enabled: local.hoursEnabled, timezone: local.timeZone, week: local.hoursWeek };
		const res = await fetch("/api/customer-account/branches/contact", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		if (!res.ok) {
			setError(data.error || "No pudimos guardar los datos del local.");
			return false;
		}
		setLocalDirty(false);
		setReloadKey((key) => key + 1);
		return true;
	}

	/** Guarda lo del paso actual antes de moverse. */
	async function saveCurrent(): Promise<boolean> {
		if (step === "marca" || step === "diseno") return saveTheme();
		if (step === "local") return saveLocal();
		return true;
	}

	async function goTo(next: OwnerSetupStep) {
		if (next === step || busy) return;
		setError(null);
		setBusy("save");
		try {
			if (!(await saveCurrent())) return;
			setStep(next);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} finally {
			setBusy(null);
		}
	}

	async function uploadLogo(file: File) {
		setError(null);
		const validation = await validateStoreThemeAssetFile("logoUrl", file);
		if (!validation.ok) {
			setError(validation.error || "Ese archivo no sirve como logo.");
			return;
		}
		// El archivo local sirve para leer sus colores y para la vista previa (mismo origen).
		if (logoBlobUrl.current) URL.revokeObjectURL(logoBlobUrl.current);
		logoBlobUrl.current = URL.createObjectURL(file);
		setLogoPreviewUrl(logoBlobUrl.current);
		setBrandColor(undefined);
		setUploading(true);
		try {
			const form = new FormData();
			form.set("field", "logoUrl");
			form.set("file", file);
			const res = await fetch("/api/customer-account/store-theme/assets", { method: "POST", body: form });
			const data = (await res.json().catch(() => ({}))) as ThemeSaveResponse;
			if (!res.ok || !data.draft?.theme) throw new Error(data.error || "No pudimos subir tu logo.");
			const saved = normalizeStoreThemeConfig(data.draft.theme);
			setTheme((prev) => ({ ...prev, logoUrl: saved.logoUrl }));
		} catch (err) {
			setError(err instanceof Error ? err.message : "No pudimos subir tu logo.");
			setLogoPreviewUrl(initial.logoPreviewUrl);
		} finally {
			setUploading(false);
		}
	}

	async function skip() {
		setBusy("skip");
		try {
			await saveCurrent().catch(() => false);
			await fetch("/api/customer-account/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "skip" }),
			}).catch(() => null);
			router.push("/cuenta");
		} finally {
			setBusy(null);
		}
	}

	async function publish() {
		setError(null);
		setBusy("publish");
		try {
			if (!(await saveTheme())) return;
			// Sin borrador guardado no hay nada que publicar: se guarda el nombre para crearlo.
			const ensure = await fetch("/api/customer-account/store-theme", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ patch: { displayName: effectiveTheme.displayName } }),
			});
			if (!ensure.ok) {
				const data = (await ensure.json().catch(() => ({}))) as { error?: string };
				setError(data.error || "No pudimos preparar tu tienda para publicar.");
				return;
			}
			const res = await fetch("/api/customer-account/store-theme/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ comment: "Configura tu tienda", changedFields: [] }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				setError(data.error || "No pudimos publicar. Intenta de nuevo.");
				return;
			}
			setPublished(true);
			await fetch("/api/customer-account/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "finish" }),
			}).catch(() => null);
		} finally {
			setBusy(null);
		}
	}

	function finish() {
		setBusy("finish");
		router.push("/cuenta");
	}

	const next = OWNER_SETUP_STEPS[stepIndex + 1];
	const prev = OWNER_SETUP_STEPS[stepIndex - 1];
	const nextLabel = step === "menu" && menuStatus.productCount === 0 ? "Lo hago después" : "Siguiente";

	const preview = (
		<SetupPreview
			theme={previewTheme}
			menuSlug={initial.company.publicSlug}
			customDomain={initial.company.customDomain}
			branchId={initial.branch?.id ?? null}
			reloadKey={reloadKey}
		/>
	);

	return (
		<div className="min-h-screen bg-[#f5f5f7] pb-20 lg:pb-0">
			<header className="sticky top-0 z-20 border-b border-[#e5e5ea] bg-white/90 backdrop-blur">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
					<div className="min-w-0">
						<p className="text-xs font-medium text-[#86868b]">
							Paso {stepIndex + 1} de {OWNER_SETUP_STEPS.length}
						</p>
						<h1 className="truncate text-lg font-semibold tracking-[-0.01em] text-[#1d1d1f]">Configura tu tienda</h1>
					</div>
					{!published && (
						<Button variant="ghost" size="sm" onClick={skip} loading={busy === "skip"}>
							Hacerlo después
						</Button>
					)}
				</div>
				<nav aria-label="Pasos" className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6">
					<ol className="flex min-w-max gap-1.5">
						{OWNER_SETUP_STEPS.map((id, index) => {
							const current = id === step;
							const done = stepDone[id];
							return (
								<li key={id}>
									<button
										type="button"
										onClick={() => void goTo(id)}
										disabled={published && id !== "publicar"}
										aria-current={current ? "step" : undefined}
										className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${current ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]"}`}
									>
										<span
											className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${current ? "bg-white text-[#1d1d1f]" : done ? "bg-emerald-500 text-white" : "bg-white text-[#86868b]"}`}
										>
											{done && !current ? <Check className="h-2.5 w-2.5" aria-hidden /> : index + 1}
										</span>
										{STEP_LABEL[id]}
									</button>
								</li>
							);
						})}
					</ol>
				</nav>
			</header>

			<main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:py-8">
				<div className="min-w-0 space-y-6">
					{error && (
						<Alert variant="danger" onDismiss={() => setError(null)}>
							{error}
						</Alert>
					)}

					<section className="rounded-3xl border border-[#e5e5ea] bg-white p-5 sm:p-7">
						{step === "marca" && (
							<BrandStep
								displayName={displayName}
								onDisplayNameChange={setDisplayName}
								logoPreviewUrl={logoPreviewUrl}
								onUploadLogo={(file) => void uploadLogo(file)}
								uploading={uploading}
								brandColor={brandColor}
								onBrandColorChange={setBrandColor}
							/>
						)}
						{step === "diseno" && (
							<DesignStep
								sector={initial.sector}
								selectedId={effectiveTheme.templateId ?? ""}
								onSelect={setPickedTemplateId}
								brandColor={brandColor ? (brandButtonColors(brandColor)?.primaryColor ?? null) : null}
							/>
						)}
						{step === "menu" && (
							<>
								<div className="mb-6">
									<h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1d1d1f]">Tu menú</h2>
									<p className="mt-1 text-sm text-[#6e6e73]">Súbelo desde una foto o un Excel, o empieza con un ejemplo y cámbialo después.</p>
								</div>
								<AccountMenuTab
									embedded
									company={initial.company}
									menuSetup={{ ...initial.menuSetup, ...menuStatus }}
									onStatusChange={(status) => {
										setMenuStatus(status);
										setReloadKey((key) => key + 1);
									}}
								/>
							</>
						)}
						{step === "local" &&
							(initial.branch ? (
								<LocalStep
									form={local}
									onChange={(patch) => {
										setLocal((prevForm) => ({ ...prevForm, ...patch }));
										setLocalDirty(true);
										if ("whatsapp" in patch) setWhatsappError(null);
									}}
									whatsappError={whatsappError}
									disabled={busy != null}
									country={initial.company.country}
								/>
							) : (
								<p className="text-sm text-[#6e6e73]">Tu tienda todavía no tiene un local. Lo puedes crear desde «Locales» en tu cuenta.</p>
							))}
						{step === "publicar" && (
							<PublishStep
								storeUrl={initial.storeUrl}
								published={published}
								publishing={busy === "publish"}
								onPublish={() => void publish()}
								onFinish={finish}
								finishing={busy === "finish"}
								checklist={[
									{ label: "Tu logo", done: stepDone.marca },
									{ label: "Un diseño para tu menú", done: stepDone.diseno },
									{
										label: realProducts > 0 ? "Tu menú con productos" : menuStatus.sampleCount > 0 ? "Menú de ejemplo (cámbialo por el tuyo)" : "Tu menú con productos",
										done: menuStatus.productCount > 0,
									},
									{ label: "WhatsApp y dirección", done: stepDone.local },
								]}
							/>
						)}
					</section>

					{step !== "publicar" && (
						<div className="flex items-center justify-between gap-3">
							{prev ? (
								<Button variant="secondary" onClick={() => void goTo(prev)} disabled={busy != null} icon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
									Atrás
								</Button>
							) : (
								<span />
							)}
							{next && (
								<Button onClick={() => void goTo(next)} loading={busy === "save"}>
									{nextLabel}
									<ArrowRight className="h-4 w-4" aria-hidden />
								</Button>
							)}
						</div>
					)}
				</div>

				<aside className="hidden lg:block">
					<div className="sticky top-36">{preview}</div>
				</aside>
			</main>

			{/* En el teléfono la vista previa se abre encima, para no tener que bajar hasta ella. */}
			<button
				type="button"
				onClick={() => setPreviewOpen(true)}
				className="fixed bottom-5 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-4 py-3 text-sm font-medium text-white shadow-lg lg:hidden"
			>
				<Smartphone className="h-4 w-4" aria-hidden />
				Ver cómo queda
			</button>
			{previewOpen && (
				<div role="dialog" aria-modal="true" aria-label="Vista previa de tu menú" className="fixed inset-0 z-40 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm lg:hidden">
					<div className="mx-auto mb-3 flex max-w-[410px] justify-end">
						<button
							type="button"
							onClick={() => setPreviewOpen(false)}
							className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#1d1d1f]"
						>
							<X className="h-4 w-4" aria-hidden />
							Cerrar
						</button>
					</div>
					{preview}
				</div>
			)}
		</div>
	);
}
