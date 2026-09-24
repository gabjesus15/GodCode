"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
	HOME_SOCIAL_PLATFORMS,
	parseBranchContactUrlInput,
	phoneToTelHref,
	sanitizeHomeUrl,
	socialInputToUrl,
	type HomePageConfig,
	type HomeSocialPlatform,
} from "@/lib/tenant/home-page/home-page-config";
import { resolveHomePage, type HomeViewModel, type ResolveHomePageInput } from "@/lib/tenant/home-page/resolve-home-page";
import type { BranchSummary } from "../shared/customer-account-types";

export type HomePreviewContext = Omit<ResolveHomePageInput, "config">;

export type BranchContactDraft = {
	phone: string;
	address: string;
	whatsapp_url: string;
	instagram_url: string;
	map_url: string;
};

export type SocialInputs = Record<HomeSocialPlatform, string>;

/** Errores de validación por campo, para marcarlos en su sitio. */
export type HomeEditorErrors = {
	links: Record<string, string>;
	socials: Partial<Record<HomeSocialPlatform, string>>;
	branches: Record<string, Partial<Record<keyof BranchContactDraft, string>>>;
};

const EMPTY_ERRORS: HomeEditorErrors = { links: {}, socials: {}, branches: {} };

function branchToDraft(branch: BranchSummary): BranchContactDraft {
	return {
		phone: branch.phone ?? "",
		address: branch.address ?? "",
		whatsapp_url: branch.whatsapp_url ?? "",
		instagram_url: branch.instagram_url ?? "",
		map_url: branch.map_url ?? "",
	};
}

function socialsToInputs(config: HomePageConfig): SocialInputs {
	const inputs = Object.fromEntries(HOME_SOCIAL_PLATFORMS.map((platform) => [platform, ""])) as SocialInputs;
	for (const social of config.socials) inputs[social.platform] = social.url;
	return inputs;
}

function inputsToSocials(inputs: SocialInputs): HomePageConfig["socials"] {
	return HOME_SOCIAL_PLATFORMS.flatMap((platform) => {
		const url = socialInputToUrl(platform, inputs[platform]);
		return url ? [{ platform, url }] : [];
	});
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
	return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

export function useHomePageEditor({
	branches,
	initialSchedule,
}: {
	branches: BranchSummary[];
	initialSchedule: string;
}) {
	const router = useRouter();
	const activeBranches = useMemo(() => branches.filter((branch) => branch.is_active !== false), [branches]);

	const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
	const [loadError, setLoadError] = useState<string | null>(null);
	const [context, setContext] = useState<HomePreviewContext | null>(null);

	const [config, setConfig] = useState<HomePageConfig | null>(null);
	const [savedConfig, setSavedConfig] = useState<HomePageConfig | null>(null);
	const [socials, setSocials] = useState<SocialInputs | null>(null);
	const [savedSocials, setSavedSocials] = useState<SocialInputs | null>(null);
	const [schedule, setSchedule] = useState(initialSchedule);
	const [savedSchedule, setSavedSchedule] = useState(initialSchedule);
	const [branchDrafts, setBranchDrafts] = useState<Record<string, BranchContactDraft>>(() =>
		Object.fromEntries(activeBranches.map((branch) => [branch.id, branchToDraft(branch)])),
	);
	const [savedBranchDrafts, setSavedBranchDrafts] = useState(branchDrafts);

	/** Foto propia recién subida (aún sin guardar) y su URL firmada para la vista previa. */
	const [coverUpload, setCoverUpload] = useState<{ path: string; url: string } | null>(null);
	const [coverUploading, setCoverUploading] = useState(false);

	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [errors, setErrors] = useState<HomeEditorErrors>(EMPTY_ERRORS);
	const okTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const load = useCallback(async () => {
		setLoadState("loading");
		setLoadError(null);
		try {
			const res = await fetch("/api/customer-account/home-page", { cache: "no-store" });
			const data = await readJson(res);
			if (!res.ok) throw new Error(String(data.error ?? "No se pudo cargar tu página de inicio."));
			const loaded = data.config as HomePageConfig;
			setContext(data.preview as HomePreviewContext);
			setConfig(loaded);
			setSavedConfig(loaded);
			const inputs = socialsToInputs(loaded);
			setSocials(inputs);
			setSavedSocials(inputs);
			setLoadState("ready");
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : "No se pudo cargar tu página de inicio.");
			setLoadState("error");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => () => {
		if (okTimer.current) clearTimeout(okTimer.current);
	}, []);

	// Si otra pestaña guarda sucursales u horario, el servidor manda props nuevas.
	useEffect(() => {
		const next = Object.fromEntries(activeBranches.map((branch) => [branch.id, branchToDraft(branch)]));
		setBranchDrafts(next);
		setSavedBranchDrafts(next);
	}, [activeBranches]);

	useEffect(() => {
		setSchedule(initialSchedule);
		setSavedSchedule(initialSchedule);
	}, [initialSchedule]);

	const configDirty =
		JSON.stringify(config) !== JSON.stringify(savedConfig) || JSON.stringify(socials) !== JSON.stringify(savedSocials);
	const scheduleDirty = schedule.trim() !== savedSchedule.trim();
	const changedBranchIds = activeBranches
		.map((branch) => branch.id)
		.filter((id) => JSON.stringify(branchDrafts[id]) !== JSON.stringify(savedBranchDrafts[id]));
	const dirty = configDirty || scheduleDirty || changedBranchIds.length > 0;

	const updateConfig = useCallback((patch: Partial<HomePageConfig> | ((prev: HomePageConfig) => HomePageConfig)) => {
		setOk(null);
		setConfig((prev) => {
			if (!prev) return prev;
			return typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
		});
	}, []);

	const updateSocial = useCallback((platform: HomeSocialPlatform, value: string) => {
		setOk(null);
		setSocials((prev) => (prev ? { ...prev, [platform]: value } : prev));
		setErrors((prev) => ({ ...prev, socials: { ...prev.socials, [platform]: undefined } }));
	}, []);

	const updateBranch = useCallback((branchId: string, patch: Partial<BranchContactDraft>) => {
		setOk(null);
		setBranchDrafts((prev) => ({ ...prev, [branchId]: { ...prev[branchId], ...patch } }));
		setErrors((prev) => ({ ...prev, branches: { ...prev.branches, [branchId]: {} } }));
	}, []);

	const updateSchedule = useCallback((value: string) => {
		setOk(null);
		setSchedule(value);
	}, []);

	const clearLinkError = useCallback((id: string) => {
		setErrors((prev) => {
			if (!prev.links[id]) return prev;
			const links = { ...prev.links };
			delete links[id];
			return { ...prev, links };
		});
	}, []);

	const uploadCover = useCallback(
		async (file: File | null) => {
			if (!file) return;
			setCoverUploading(true);
			setError(null);
			try {
				const form = new FormData();
				form.append("file", file);
				if (coverUpload?.path) form.append("replaces", coverUpload.path);
				const res = await fetch("/api/customer-account/home-page/cover", { method: "POST", body: form });
				const data = await readJson(res);
				if (!res.ok) throw new Error(String(data.error ?? "No se pudo subir la foto."));
				const path = String(data.path ?? "");
				setCoverUpload({ path, url: String(data.signedUrl ?? "") });
				updateConfig({ coverMode: "custom-image", coverImagePath: path });
			} catch (err) {
				setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
			} finally {
				setCoverUploading(false);
			}
		},
		[coverUpload?.path, updateConfig],
	);

	const discard = useCallback(() => {
		setConfig(savedConfig);
		setSocials(savedSocials);
		setSchedule(savedSchedule);
		setBranchDrafts(savedBranchDrafts);
		setCoverUpload(null);
		setErrors(EMPTY_ERRORS);
		setError(null);
	}, [savedBranchDrafts, savedConfig, savedSchedule, savedSocials]);

	/** Lo que se va a guardar, o los errores que lo impiden. */
	const validate = useCallback((): { config: HomePageConfig } | null => {
		if (!config || !socials) return null;
		const next: HomeEditorErrors = { links: {}, socials: {}, branches: {} };

		for (const link of config.links) {
			if (link.kind !== "custom") continue;
			if (!link.label.trim()) next.links[link.id] = "Ponle un nombre al botón.";
			else if (!sanitizeHomeUrl(link.url)) next.links[link.id] = "El enlace no es válido. Pega la dirección completa (https://…).";
		}
		for (const platform of HOME_SOCIAL_PLATFORMS) {
			if (socials[platform].trim() && !socialInputToUrl(platform, socials[platform])) {
				next.socials[platform] = "No reconocemos este enlace o usuario.";
			}
		}
		for (const id of changedBranchIds) {
			const draft = branchDrafts[id];
			const branchErrors: Partial<Record<keyof BranchContactDraft, string>> = {};
			for (const field of ["whatsapp_url", "instagram_url", "map_url"] as const) {
				if (!parseBranchContactUrlInput(draft[field]).ok) branchErrors[field] = "Pega la dirección completa (https://…).";
			}
			if (draft.phone.trim() && !phoneToTelHref(draft.phone)) branchErrors.phone = "Revisa el número.";
			if (Object.keys(branchErrors).length > 0) next.branches[id] = branchErrors;
		}

		setErrors(next);
		const count =
			Object.keys(next.links).length + Object.keys(next.socials).length + Object.keys(next.branches).length;
		if (count > 0) {
			setError("Hay campos por corregir antes de guardar. Están marcados en rojo.");
			return null;
		}
		return { config: { ...config, socials: inputsToSocials(socials) } };
	}, [branchDrafts, changedBranchIds, config, socials]);

	/** Guarda todo lo que cambió. Devuelve false si algo quedó sin guardar. */
	const save = useCallback(async (): Promise<boolean> => {
		setError(null);
		setOk(null);
		const valid = validate();
		if (!valid) return false;
		setSaving(true);
		try {
			if (configDirty) {
				const res = await fetch("/api/customer-account/home-page", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ config: valid.config }),
				});
				const data = await readJson(res);
				if (!res.ok) throw new Error(String(data.error ?? "No se pudo guardar la página."));
				const stored = data.config as HomePageConfig;
				const inputs = socialsToInputs(stored);
				setConfig(stored);
				setSavedConfig(stored);
				setSocials(inputs);
				setSavedSocials(inputs);
				setCoverUpload(null);
				if (context && coverUpload && stored.coverImagePath === coverUpload.path) {
					setContext({ ...context, customCoverUrl: coverUpload.url });
				}
			}

			if (scheduleDirty) {
				const res = await fetch("/api/customer-account/business-info", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ schedule }),
				});
				const data = await readJson(res);
				if (!res.ok) throw new Error(String(data.error ?? "No se pudo guardar el horario."));
				setSavedSchedule(schedule);
			}

			// Solo las sucursales que cambiaron (antes se reenviaban todas en cada guardado).
			for (const id of changedBranchIds) {
				const branch = activeBranches.find((entry) => entry.id === id);
				const res = await fetch("/api/customer-account/branches/contact", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ id, ...branchDrafts[id] }),
				});
				const data = await readJson(res);
				if (!res.ok) throw new Error(String(data.error ?? `No se pudo guardar ${branch?.name ?? "la sucursal"}.`));
				setSavedBranchDrafts((prev) => ({ ...prev, [id]: branchDrafts[id] }));
			}

			setOk("Guardado. Tu página ya está publicada con estos cambios.");
			if (okTimer.current) clearTimeout(okTimer.current);
			okTimer.current = setTimeout(() => setOk(null), 5000);
			if (scheduleDirty || changedBranchIds.length > 0) router.refresh();
			return true;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error inesperado al guardar.");
			return false;
		} finally {
			setSaving(false);
		}
	}, [
		activeBranches,
		branchDrafts,
		changedBranchIds,
		configDirty,
		context,
		coverUpload,
		router,
		schedule,
		scheduleDirty,
		validate,
	]);

	/** Sucursales con los contactos que se están editando (aún sin guardar). */
	const previewBranches = useMemo(
		() =>
			(context?.branches ?? []).map((branch) => {
				const draft = branchDrafts[branch.id];
				return draft
					? { ...branch, phone: draft.phone, whatsapp_url: draft.whatsapp_url, instagram_url: draft.instagram_url, map_url: draft.map_url }
					: branch;
			}),
		[branchDrafts, context?.branches],
	);

	/** La vista previa: config en edición + datos vivos, resueltos igual que en la página pública. */
	const model: HomeViewModel | null = useMemo(() => {
		if (!context || !config || !socials) return null;
		return resolveHomePage({
			...context,
			config: { ...config, socials: inputsToSocials(socials) },
			branches: previewBranches,
			schedule,
			customCoverUrl: coverUpload?.url ?? context.customCoverUrl,
		});
	}, [config, context, coverUpload?.url, previewBranches, schedule, socials]);

	return {
		loadState,
		loadError,
		reload: load,
		context,
		config,
		socials,
		schedule,
		branchDrafts,
		activeBranches,
		previewBranches,
		model,
		dirty,
		saving,
		error,
		ok,
		errors,
		coverUpload,
		coverUploading,
		updateConfig,
		updateSocial,
		updateBranch,
		updateSchedule,
		clearLinkError,
		uploadCover,
		discard,
		save,
	};
}

export type HomePageEditorState = ReturnType<typeof useHomePageEditor>;
