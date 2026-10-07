import { useCallback, useMemo, useRef, useState } from "react";

import { createOwnerSetupApi, type OwnerSetupApi, type OwnerSetupLocalPatch } from "./api";
import { computeEffectiveTheme, initialBrandColor, type BrandColorChoice } from "./effective-theme";
import { ownerSetupCompletion, ownerSetupStepDone } from "./progress";
import { nextOwnerSetupStep, OWNER_SETUP_STEPS, ownerSetupStepIndex, previousOwnerSetupStep, type OwnerSetupStep } from "./steps";
import type { LocalForm, OwnerSetupInitial, OwnerSetupMenuStatus } from "./types";

import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { diffStoreTheme } from "@/lib/store-theme/store-theme-utils";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { businessHoursWeekFromScheduleText, hasAnyBusinessHours } from "@/lib/tenant/business-hours";
import { socialInputToUrl } from "@/lib/tenant/home-page/home-page-config";
import { phoneFromWhatsappUrl, whatsappUrlFromPhone } from "@/lib/tenant/whatsapp-url";

/**
 * Todo el estado y las acciones de «Configura tu tienda», sin nada del navegador: la
 * pantalla web solo pinta lo que devuelve, y una app puede usar el mismo hook con sus
 * propias vistas (y su `api` con `baseUrl`).
 */

export type OwnerSetupBusy = "save" | "skip" | "publish" | "finish" | null;

function instagramHandle(url: string | null): string {
	const match = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(url ?? "");
	return match ? `@${match[1]}` : (url ?? "");
}

export function initialLocalForm(initial: OwnerSetupInitial): LocalForm {
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

export function isVenezuela(country: string | null | undefined): boolean {
	return /venezuela|^ve$/i.test(country ?? "");
}

export function useOwnerSetup({
	initial,
	initialStep,
	api: apiOverride,
	onExit,
}: {
	initial: OwnerSetupInitial;
	initialStep: OwnerSetupStep;
	api?: OwnerSetupApi;
	/** Salir del asistente (a la cuenta). */
	onExit: () => void;
}) {
	const api = useMemo(() => apiOverride ?? createOwnerSetupApi(), [apiOverride]);
	const country = initial.company.country;

	const [step, setStep] = useState<OwnerSetupStep>(initialStep);
	/** 1 al avanzar, -1 al volver: la pantalla anima hacia ese lado. */
	const [direction, setDirection] = useState<1 | -1>(1);
	const [theme, setTheme] = useState<StoreThemeConfig>(initial.theme);
	const [displayName, setDisplayName] = useState(initial.theme.displayName || initial.company.name);
	const [pickedTemplateId, setPickedTemplateId] = useState<string | null>(null);
	const [brandColor, setBrandColor] = useState<BrandColorChoice>(() => initialBrandColor(initial.theme));
	const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(initial.logoPreviewUrl);
	const [uploading, setUploading] = useState(false);
	const [menuStatus, setMenuStatusState] = useState<OwnerSetupMenuStatus>(initial.menuSetup);
	const [reloadKey, setReloadKey] = useState(0);
	const [local, setLocal] = useState<LocalForm>(() => initialLocalForm(initial));
	const [localDirty, setLocalDirty] = useState(false);
	const [whatsappError, setWhatsappError] = useState<string | null>(null);
	const [busy, setBusy] = useState<OwnerSetupBusy>(null);
	const [error, setError] = useState<string | null>(null);
	const [published, setPublished] = useState(false);
	const [savedAt, setSavedAt] = useState<number | null>(null);
	const setupMarked = useRef<Promise<unknown> | null>(null);

	const effectiveTheme = useMemo(
		() => computeEffectiveTheme({ theme, displayName, pickedTemplateId, brandColor }),
		[theme, displayName, pickedTemplateId, brandColor],
	);
	const previewTheme = useMemo(
		() => ({ ...effectiveTheme, logoUrl: logoPreviewUrl || effectiveTheme.logoUrl }),
		[effectiveTheme, logoPreviewUrl],
	);

	const whatsappUrl = whatsappUrlFromPhone(local.whatsapp, country);
	const stepDone = ownerSetupStepDone({
		logoUrl: theme.logoUrl,
		templateId: effectiveTheme.templateId,
		productCount: menuStatus.productCount,
		whatsappUrl,
		address: local.address,
		published,
	});
	const completion = ownerSetupCompletion(stepDone);
	const stepIndex = ownerSetupStepIndex(step);

	const saveTheme = useCallback(async (): Promise<boolean> => {
		const patch: Partial<StoreThemeConfig> = diffStoreTheme(effectiveTheme, theme);
		delete patch.logoUrl;
		if (Object.keys(patch).length === 0) return true;
		const result = await api.saveThemePatch(patch);
		if (!result.ok) {
			setError(result.error);
			return false;
		}
		setTheme(normalizeStoreThemeConfig(result.data.theme));
		setSavedAt(Date.now());
		return true;
	}, [api, effectiveTheme, theme]);

	const saveLocal = useCallback(async (): Promise<boolean> => {
		if (!localDirty || !initial.branch) return true;
		if (local.whatsapp.trim() && !whatsappUrl) {
			const example = isVenezuela(country) ? "+58 412 123 4567" : "+56 9 1234 5678";
			setWhatsappError(`Escribe el número completo, con el código de país (por ejemplo ${example}).`);
			return false;
		}
		setWhatsappError(null);
		const patch: OwnerSetupLocalPatch = {
			id: initial.branch.id,
			whatsapp_url: whatsappUrl ?? "",
			instagram_url: local.instagram.trim() ? socialInputToUrl("instagram", local.instagram) : "",
			address: local.address,
		};
		if (Object.values(local.hoursWeek).some((intervals) => intervals.length > 0)) {
			patch.business_hours = { enabled: local.hoursEnabled, timezone: local.timeZone, week: local.hoursWeek };
		}
		const result = await api.saveLocal(patch);
		if (!result.ok) {
			setError(result.error);
			return false;
		}
		setLocalDirty(false);
		setReloadKey((key) => key + 1);
		setSavedAt(Date.now());
		return true;
	}, [api, country, initial.branch, local, localDirty, whatsappUrl]);

	/** Guarda lo del paso actual antes de moverse. */
	const saveCurrent = useCallback(async (): Promise<boolean> => {
		if (step === "marca" || step === "diseno") return saveTheme();
		if (step === "local") return saveLocal();
		return true;
	}, [saveLocal, saveTheme, step]);

	const goTo = useCallback(
		async (target: OwnerSetupStep): Promise<boolean> => {
			if (target === step || busy) return false;
			if (published && target !== "publicar") return false;
			setError(null);
			setBusy("save");
			try {
				if (!(await saveCurrent())) return false;
				setDirection(ownerSetupStepIndex(target) > stepIndex ? 1 : -1);
				setStep(target);
				return true;
			} finally {
				setBusy(null);
			}
		},
		[busy, published, saveCurrent, step, stepIndex],
	);

	const next = nextOwnerSetupStep(step);
	const previous = previousOwnerSetupStep(step);
	const goNext = useCallback(() => (next ? goTo(next) : Promise.resolve(false)), [goTo, next]);
	const goBack = useCallback(() => (previous ? goTo(previous) : Promise.resolve(false)), [goTo, previous]);

	/** Sube el logo al borrador. El archivo puede ser un `File` del navegador o un `Blob`. */
	const uploadLogo = useCallback(
		async (file: Blob, fileName?: string): Promise<boolean> => {
			setError(null);
			setBrandColor(undefined);
			setUploading(true);
			try {
				const result = await api.uploadLogo(file, fileName);
				if (!result.ok) {
					setError(result.error);
					return false;
				}
				const saved = normalizeStoreThemeConfig(result.data.theme);
				setTheme((prev) => ({ ...prev, logoUrl: saved.logoUrl }));
				if (result.data.signedUrl) setLogoPreviewUrl(result.data.signedUrl);
				setSavedAt(Date.now());
				return true;
			} finally {
				setUploading(false);
			}
		},
		[api],
	);

	const updateLocal = useCallback((patch: Partial<LocalForm>) => {
		setLocal((prev) => ({ ...prev, ...patch }));
		setLocalDirty(true);
		if ("whatsapp" in patch) setWhatsappError(null);
	}, []);

	const setMenuStatus = useCallback((status: OwnerSetupMenuStatus) => {
		setMenuStatusState(status);
		setReloadKey((key) => key + 1);
	}, []);

	const skip = useCallback(async () => {
		setBusy("skip");
		try {
			await saveCurrent().catch(() => false);
			await api.markSetup("skip");
			onExit();
		} finally {
			setBusy(null);
		}
	}, [api, onExit, saveCurrent]);

	const publish = useCallback(async (): Promise<boolean> => {
		setError(null);
		setBusy("publish");
		try {
			if (!(await saveTheme())) return false;
			// Sin borrador guardado no hay nada que publicar: se guarda el nombre para crearlo.
			const ensured = await api.saveThemePatch({ displayName: effectiveTheme.displayName });
			if (!ensured.ok) {
				setError(ensured.error);
				return false;
			}
			const result = await api.publishTheme("Configura tu tienda");
			if (!result.ok) {
				setError(result.error);
				return false;
			}
			setPublished(true);
			// La celebración no espera a esto; «Ir a mi cuenta» sí.
			setupMarked.current = api.markSetup("finish");
			return true;
		} finally {
			setBusy(null);
		}
	}, [api, effectiveTheme.displayName, saveTheme]);

	const finish = useCallback(async () => {
		setBusy("finish");
		await setupMarked.current;
		onExit();
	}, [onExit]);

	return {
		steps: OWNER_SETUP_STEPS,
		step,
		stepIndex,
		direction,
		next,
		previous,
		goTo,
		goNext,
		goBack,
		stepDone,
		completion,

		theme,
		effectiveTheme,
		previewTheme,
		displayName,
		setDisplayName,
		selectTemplate: setPickedTemplateId,
		brandColor,
		setBrandColor,
		logoPreviewUrl,
		uploading,
		uploadLogo,

		menuStatus,
		setMenuStatus,
		reloadKey,

		local,
		updateLocal,
		whatsappError,
		whatsappUrl,

		busy,
		error,
		clearError: () => setError(null),
		reportError: setError,
		savedAt,
		published,
		publish,
		skip,
		finish,
	};
}

export type OwnerSetupController = ReturnType<typeof useOwnerSetup>;
