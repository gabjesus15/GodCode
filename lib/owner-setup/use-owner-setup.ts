import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createOwnerSetupApi, type OwnerSetupApi } from "./api";
import { computeEffectiveTheme, initialBrandColor, type BrandColorChoice } from "./effective-theme";
import { buildLocalPatch, initialLocalForm, localFormAfterSave, whatsappExample } from "./local-form";
import { ownerSetupCompletion, ownerSetupStepDone } from "./progress";
import { nextOwnerSetupStep, OWNER_SETUP_STEPS, ownerSetupStepIndex, previousOwnerSetupStep, type OwnerSetupStep } from "./steps";
import type { LocalForm, OwnerSetupInitial, OwnerSetupMenuStatus } from "./types";

import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { trackEvent } from "@/lib/analytics/track-event";
import { diffStoreTheme } from "@/lib/store-theme/store-theme-utils";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { whatsappUrlFromPhone } from "@/lib/tenant/whatsapp-url";

/**
 * Todo el estado y las acciones de «Configura tu tienda», sin nada del navegador: la
 * pantalla web solo pinta lo que devuelve, y una app puede usar el mismo hook con sus
 * propias vistas (y su `api` con `baseUrl`).
 */

export type OwnerSetupBusy = "save" | "skip" | "publish" | "finish" | null;

/** Adónde va «Publicar mi tienda» con la tienda en vista previa: elegir plan y pagar. */
export const STORE_DRAFT_PUBLISH_PATH = "/cuenta/publicar";

export function useOwnerSetup({
	initial,
	initialStep,
	api: apiOverride,
	onExit,
	onPublishDraft,
}: {
	initial: OwnerSetupInitial;
	initialStep: OwnerSetupStep;
	api?: OwnerSetupApi;
	/** Salir del asistente (a la cuenta). */
	onExit: () => void;
	/** Tienda en vista previa: tras guardar el diseño, ir a elegir plan y pagar. */
	onPublishDraft?: () => void;
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
	/** El dueño tocó el horario: solo entonces un horario vacío se guarda como borrado. */
	const [hoursTouched, setHoursTouched] = useState(false);
	const [whatsappError, setWhatsappError] = useState<string | null>(null);
	const [busy, setBusy] = useState<OwnerSetupBusy>(null);
	const [error, setError] = useState<string | null>(null);
	const [published, setPublished] = useState(Boolean(initial.justOpened));
	const draft = initial.storeDraft ?? null;
	const [savedAt, setSavedAt] = useState<number | null>(null);
	const setupMarked = useRef<Promise<unknown> | null>(null);

	// Vuelve del pago con la tienda abierta: el asistente queda terminado.
	useEffect(() => {
		if (initial.justOpened && !setupMarked.current) setupMarked.current = api.markSetup("finish");
	}, [api, initial.justOpened]);

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
			setWhatsappError(`Escribe el número completo, con el código de país (por ejemplo ${whatsappExample(country)}).`);
			return false;
		}
		setWhatsappError(null);
		const patch = buildLocalPatch({ branchId: initial.branch.id, form: local, whatsappUrl, hoursTouched });
		const result = await api.saveLocal(patch);
		if (!result.ok) {
			setError(result.error);
			return false;
		}
		setLocal((prev) => localFormAfterSave(prev, patch));
		setLocalDirty(false);
		setHoursTouched(false);
		setReloadKey((key) => key + 1);
		setSavedAt(Date.now());
		return true;
	}, [api, country, hoursTouched, initial.branch, local, localDirty, whatsappUrl]);

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
		if ("hoursWeek" in patch || "hoursEnabled" in patch) setHoursTouched(true);
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
		// Al ir a pagar se sale de la página: el botón sigue cargando hasta entonces.
		let leaving = false;
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
			trackEvent("setup_completed", { flow: draft ? "draft" : "classic" });
			if (draft) {
				// En vista previa el diseño ya quedó listo: falta el plan y el pago para abrirla.
				trackEvent("publish_click", { flow: "draft", from: "setup" });
				leaving = Boolean(onPublishDraft);
				onPublishDraft?.();
				return true;
			}
			setPublished(true);
			// La celebración no espera a esto; «Ir a mi cuenta» sí.
			setupMarked.current = api.markSetup("finish");
			return true;
		} finally {
			if (!leaving) setBusy(null);
		}
	}, [api, draft, effectiveTheme.displayName, onPublishDraft, saveTheme]);

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
