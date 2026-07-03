"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StoreThemeAssetField, StoreThemeAutosaveStatus, StoreThemeConfig, StoreThemeResponse } from "../shared/customer-account-types";
import {
  buildContrastSuggestions,
  buildStoreThemeChecklist,
  getStoreThemeSignature,
  normalizeStoreThemeInput,
  validateStoreThemeAssetFile,
} from "@/lib/store-theme/store-theme-utils";
import { STORE_THEME_FIELD_LABELS, STORE_THEME_TEMPLATES } from "../shared/customer-account-store-theme-constants";
import { uploadImage } from "@/components/tenant/utils/cloudinary";

export type UseStoreThemeReturn = {
  storeThemeLoading:        boolean;
  storeThemeSaving:         boolean;
  storeThemePublishing:     boolean;
  storeThemeRestoring:      string | null;
  storeThemeError:          string | null;
  storeThemeOk:             string | null;
  storeThemePublished:      StoreThemeConfig | null;
  storeThemeDraft:          StoreThemeConfig | null;
  setStoreThemeDraft:       React.Dispatch<React.SetStateAction<StoreThemeConfig | null>>;
  storeThemeVersions:       StoreThemeResponse["versions"];
  storeThemeUpdatedAt:      string | null;
  storeThemeUpdatedBy:      string | null;
  storeThemeHasUnpublished: boolean;
  setStoreThemeHasUnpublished: React.Dispatch<React.SetStateAction<boolean>>;
  storeThemeAutosaveStatus: StoreThemeAutosaveStatus;
  storeThemeAutosaveError:  string | null;
  storeThemeHasLocalUnsavedChanges: boolean;
  storePreviewTheme:        StoreThemeConfig | null;
  publicationStateLabel:    string;
  storeThemeDiffRows:       Array<{ key: keyof StoreThemeConfig; label: string; draftValue: string; publishedValue: string }>;
  storeThemeChecklist:      ReturnType<typeof buildStoreThemeChecklist>;
  storeThemeChecklistBlockingIssues: ReturnType<typeof buildStoreThemeChecklist>;
  storeThemeContrastSuggestions: ReturnType<typeof buildContrastSuggestions>;
  storeThemeAssetLocalPreview: { logoUrl: string | null; backgroundImageUrl: string | null };
  storeThemeAssetUploading: StoreThemeAssetField | null;
  storeThemeAssetDragOver:  StoreThemeAssetField | null;
  setStoreThemeAssetDragOver: React.Dispatch<React.SetStateAction<StoreThemeAssetField | null>>;
  storeThemeAssetHint:      Record<StoreThemeAssetField, string | null>;
  storeThemeSelectedTemplate: string;
  setStoreThemeSelectedTemplate: (v: string) => void;
  storeThemePublishComment: string;
  setStoreThemePublishComment: (v: string) => void;
  latestPublishedVersion:   StoreThemeResponse["versions"][number] | null;
  saveStoreDraft:           () => Promise<boolean>;
  publishStoreTheme:        () => Promise<void>;
  restoreStoreVersion:      (versionId: string) => Promise<void>;
  discardStoreThemeChanges: () => void;
  applyStoreThemeTemplate:  () => void;
  exportStoreThemeJson:     (slug: string) => void;
  importStoreThemeJson:     (file: File | null, companyName: string) => Promise<void>;
  handleStoreThemeAssetUpload: (field: StoreThemeAssetField, file: File | null) => Promise<void>;
  restoreStoreThemeColorsFromProduction: () => void;
  applyStoreThemeContrastSuggestions: () => void;
  setStoreThemeLocalPreview:(field: StoreThemeAssetField, url: string | null) => void;
};

export function useStoreTheme(onConfirmDiscard: () => Promise<boolean>): UseStoreThemeReturn {
  const [storeThemeLoading,        setStoreThemeLoading]        = useState(false);
  const [storeThemeSaving,         setStoreThemeSaving]         = useState(false);
  const [storeThemePublishing,     setStoreThemePublishing]     = useState(false);
  const [storeThemeRestoring,      setStoreThemeRestoring]      = useState<string | null>(null);
  const [storeThemeError,          setStoreThemeError]          = useState<string | null>(null);
  const [storeThemeOk,             setStoreThemeOk]             = useState<string | null>(null);
  const [storeThemePublished,      setStoreThemePublished]      = useState<StoreThemeConfig | null>(null);
  const [storeThemeDraft,          setStoreThemeDraft]          = useState<StoreThemeConfig | null>(null);
  const [storeThemeVersions,       setStoreThemeVersions]       = useState<StoreThemeResponse["versions"]>([]);
  const [storeThemeUpdatedAt,      setStoreThemeUpdatedAt]      = useState<string | null>(null);
  const [storeThemeUpdatedBy,      setStoreThemeUpdatedBy]      = useState<string | null>(null);
  const [storeThemeHasUnpublished, setStoreThemeHasUnpublished] = useState(false);
  const [storeThemeAutosaveStatus, setStoreThemeAutosaveStatus] = useState<StoreThemeAutosaveStatus>("idle");
  const [storeThemeAutosaveError,  setStoreThemeAutosaveError]  = useState<string | null>(null);
  const [storeThemeLastSavedSignature, setStoreThemeLastSavedSignature] = useState("");
  const [storeThemeAssetUploading, setStoreThemeAssetUploading] = useState<StoreThemeAssetField | null>(null);
  const [storeThemeAssetDragOver,  setStoreThemeAssetDragOver]  = useState<StoreThemeAssetField | null>(null);
  const [storeThemeAssetHint,      setStoreThemeAssetHint]      = useState<Record<StoreThemeAssetField, string | null>>({ logoUrl: null, backgroundImageUrl: null });
  const [storeThemeAssetLocalPreview, setStoreThemeAssetLocalPreview] = useState<{ logoUrl: string | null; backgroundImageUrl: string | null }>({ logoUrl: null, backgroundImageUrl: null });
  const [storeThemeSelectedTemplate, setStoreThemeSelectedTemplate]   = useState(STORE_THEME_TEMPLATES[0]?.id ?? "");
  const [storeThemePublishComment, setStoreThemePublishComment]       = useState("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeThemeDraftSignature = useMemo(() => getStoreThemeSignature(storeThemeDraft), [storeThemeDraft]);
  const storeThemeHasLocalUnsavedChanges = Boolean(storeThemeDraft) && storeThemeDraftSignature !== storeThemeLastSavedSignature;
  const storePreviewTheme = storeThemeDraft ?? storeThemePublished;
  const latestPublishedVersion = storeThemeVersions[0] ?? null;

  const publicationStateLabel = storeThemeHasLocalUnsavedChanges
    ? "Borrador local sin guardar"
    : !storeThemeHasUnpublished
      ? "Produccion al dia"
      : "Borrador guardado pendiente";

  const storeThemeDiffRows = useMemo(() => {
    if (!storeThemeDraft || !storeThemePublished) return [];
    return (Object.keys(STORE_THEME_FIELD_LABELS) as Array<keyof StoreThemeConfig>)
      .filter((k) => storeThemeDraft[k] !== storeThemePublished[k])
      .map((k) => ({ key: k, label: STORE_THEME_FIELD_LABELS[k], draftValue: storeThemeDraft[k] || "", publishedValue: storeThemePublished[k] || "" }));
  }, [storeThemeDraft, storeThemePublished]);

  const storeThemeChecklist = useMemo(() => buildStoreThemeChecklist(storeThemeDraft), [storeThemeDraft]);
  const storeThemeChecklistBlockingIssues = useMemo(
    () => storeThemeChecklist.filter((i) => !i.ok && ["cta-contrast","price-contrast","discount-contrast"].includes(i.id)),
    [storeThemeChecklist]
  );
  const storeThemeContrastSuggestions = useMemo(() => buildContrastSuggestions(storeThemeDraft), [storeThemeDraft]);

  const setStoreThemeLocalPreview = useCallback((field: StoreThemeAssetField, nextUrl: string | null) => {
    setStoreThemeAssetLocalPreview((prev) => {
      const prevUrl = prev[field];
      if (prevUrl?.startsWith("blob:") && prevUrl !== nextUrl) URL.revokeObjectURL(prevUrl);
      return { ...prev, [field]: nextUrl };
    });
  }, []);

  const loadStoreTheme = useCallback(async () => {
    setStoreThemeLoading(true); setStoreThemeError(null);
    try {
      const res  = await fetch("/api/customer-account/store-theme", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<StoreThemeResponse> & { error?: string };
      if (!res.ok || !data.published || !data.draft || !Array.isArray(data.versions)) {
        setStoreThemeError(data.error || "No se pudo cargar la configuracion de tienda.");
        return;
      }
      setStoreThemePublished(data.published);
      setStoreThemeDraft(data.draft.theme);
      setStoreThemeVersions(data.versions);
      setStoreThemeUpdatedAt(data.draft.updatedAt ?? null);
      setStoreThemeUpdatedBy(data.draft.updatedByEmail ?? null);
      setStoreThemeHasUnpublished(Boolean(data.draft.hasUnpublishedChanges));
      setStoreThemeLastSavedSignature(getStoreThemeSignature(data.draft.theme));
      setStoreThemeAutosaveStatus("idle");
      setStoreThemeAutosaveError(null);
    } finally { setStoreThemeLoading(false); }
  }, []);

  useEffect(() => { void loadStoreTheme(); }, [loadStoreTheme]);

  // Revoke object URLs on unmount
  useEffect(() => () => {
    [storeThemeAssetLocalPreview.logoUrl, storeThemeAssetLocalPreview.backgroundImageUrl].forEach((url) => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    });
  }, [storeThemeAssetLocalPreview.backgroundImageUrl, storeThemeAssetLocalPreview.logoUrl]);

  const persistStoreDraft = useCallback(async (mode: "manual" | "autosave"): Promise<boolean> => {
    if (!storeThemeDraft) return false;
    if (mode === "manual") { setStoreThemeSaving(true); setStoreThemeError(null); setStoreThemeOk(null); setStoreThemeAutosaveError(null); }
    else { setStoreThemeAutosaveStatus("saving"); setStoreThemeAutosaveError(null); }
    try {
      const res  = await fetch("/api/customer-account/store-theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: storeThemeDraft }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; draft?: { theme?: StoreThemeConfig; updatedAt?: string | null; updatedByEmail?: string | null; hasUnpublishedChanges?: boolean } };
      if (!res.ok) {
        const err = data.error || "No se pudo guardar el borrador.";
        if (mode === "manual") setStoreThemeError(err); else { setStoreThemeAutosaveStatus("error"); setStoreThemeAutosaveError(err); }
        return false;
      }
      const savedTheme = data.draft?.theme ?? storeThemeDraft;
      setStoreThemeDraft(savedTheme);
      setStoreThemeLastSavedSignature(getStoreThemeSignature(savedTheme));
      setStoreThemeUpdatedAt(data.draft?.updatedAt ?? new Date().toISOString());
      setStoreThemeUpdatedBy((prev) => data.draft?.updatedByEmail ?? prev);
      setStoreThemeHasUnpublished(Boolean(data.draft?.hasUnpublishedChanges ?? true));
      if (mode === "manual") setStoreThemeOk(data.message || "Borrador guardado.");
      setStoreThemeAutosaveStatus("saved");
      return true;
    } finally {
      if (mode === "manual") setStoreThemeSaving(false);
    }
  }, [storeThemeDraft]);

  // Autosave debounce
  useEffect(() => {
    if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); autosaveTimerRef.current = null; }
    if (!storeThemeDraft || storeThemeLoading || storeThemePublishing || storeThemeRestoring != null) return;
    if (storeThemeDraftSignature === storeThemeLastSavedSignature) { setStoreThemeAutosaveStatus("idle"); return; }
    setStoreThemeAutosaveStatus("pending");
    autosaveTimerRef.current = setTimeout(() => void persistStoreDraft("autosave"), 2200);
    return () => { if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); autosaveTimerRef.current = null; } };
  }, [persistStoreDraft, storeThemeDraft, storeThemeDraftSignature, storeThemeLastSavedSignature, storeThemeLoading, storeThemePublishing, storeThemeRestoring]);

  const saveStoreDraft    = async () => persistStoreDraft("manual");

  const publishStoreTheme = async () => {
    setStoreThemePublishing(true); setStoreThemeError(null); setStoreThemeOk(null);
    try {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      if (storeThemeHasLocalUnsavedChanges) {
        const saved = await persistStoreDraft("manual");
        if (!saved) return;
      }

      const res  = await fetch("/api/customer-account/store-theme/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment: storeThemePublishComment, changedFields: storeThemeDiffRows.map((r) => r.label) }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) { setStoreThemeError(data.error || "No se pudo publicar."); return; }
      setStoreThemeOk(data.message || "Cambios publicados."); setStoreThemePublishComment("");
      await loadStoreTheme();
    } finally { setStoreThemePublishing(false); }
  };

  const restoreStoreVersion = async (versionId: string) => {
    if (!versionId) return;
    setStoreThemeRestoring(versionId); setStoreThemeError(null); setStoreThemeOk(null);
    try {
      const res  = await fetch("/api/customer-account/store-theme/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) { setStoreThemeError(data.error || "No se pudo restaurar la version."); return; }
      setStoreThemeOk(data.message || "Version cargada en borrador."); await loadStoreTheme();
    } finally { setStoreThemeRestoring(null); }
  };

  const discardStoreThemeChanges = async () => {
    if (!storeThemePublished) return;
    const ok = await onConfirmDiscard();
    if (!ok) return;
    setStoreThemeError(null);
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setStoreThemeDraft(storeThemePublished);
    const res = await fetch("/api/customer-account/store-theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: storeThemePublished }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; draft?: { hasUnpublishedChanges?: boolean } };
    if (!res.ok) {
      setStoreThemeError(data.error || "No se pudo descartar el borrador.");
      return;
    }
    setStoreThemeLastSavedSignature(getStoreThemeSignature(storeThemePublished));
    setStoreThemeHasUnpublished(Boolean(data.draft?.hasUnpublishedChanges));
    setStoreThemeAutosaveStatus("idle");
    setStoreThemeOk("Borrador restaurado a produccion.");
  };

  const applyStoreThemeTemplate = () => {
    if (!storeThemeDraft || !storeThemeSelectedTemplate) return;
    const template = STORE_THEME_TEMPLATES.find((t) => t.id === storeThemeSelectedTemplate);
    if (!template) return;
    setStoreThemeError(null);
    setStoreThemeDraft((prev) => (prev ? { ...prev, ...template.colors } : prev));
    setStoreThemeHasUnpublished(true);
    setStoreThemeOk(`Plantilla aplicada: ${template.name}.`);
  };

  const exportStoreThemeJson = (slug: string) => {
    if (!storeThemeDraft) return;
    const blob = new Blob([JSON.stringify(storeThemeDraft, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `store-theme-${slug.toLowerCase()}.json`; a.click();
    URL.revokeObjectURL(url);
    setStoreThemeOk("Tema exportado en JSON.");
  };

  const importStoreThemeJson = async (file: File | null, companyName: string) => {
    if (!file || !storeThemeDraft) return;
    setStoreThemeError(null);
    try {
      const normalized = normalizeStoreThemeInput(JSON.parse(await file.text()), storeThemeDraft.displayName || companyName);
      setStoreThemeDraft(normalized);
      setStoreThemeHasUnpublished(true);
      setStoreThemeOk("Tema importado. Revisa la vista previa y guarda/publica cuando quieras.");
    } catch { setStoreThemeError("No se pudo importar el archivo JSON. Verifica el formato."); }
  };

  const handleStoreThemeAssetUpload = async (field: StoreThemeAssetField, file: File | null) => {
    if (!file || !storeThemeDraft) return;
    const validation = await validateStoreThemeAssetFile(field, file);
    if (!validation.ok) { setStoreThemeError(validation.error || "No se pudo validar el archivo."); return; }
    setStoreThemeAssetHint((prev) => ({ ...prev, [field]: validation.hint ?? null }));
    setStoreThemeLocalPreview(field, URL.createObjectURL(file));
    setStoreThemeAssetUploading(field); setStoreThemeError(null); setStoreThemeOk(null);
    try {
      const url = await uploadImage(file, "tenant");
      setStoreThemeDraft((prev) => (prev ? { ...prev, [field]: url } : prev));
      setStoreThemeHasUnpublished(true);
      setStoreThemeOk("Imagen cargada en borrador. Se guardara automaticamente en breve.");
      setStoreThemeLocalPreview(field, null);
    } catch (error) {
      setStoreThemeError(error instanceof Error ? error.message : "No se pudo subir el archivo.");
    } finally {
      setStoreThemeAssetUploading(null);
      setStoreThemeAssetDragOver((prev) => (prev === field ? null : prev));
    }
  };

  const restoreStoreThemeColorsFromProduction = () => {
    if (!storeThemeDraft || !storeThemePublished) return;
    setStoreThemeError(null);
    setStoreThemeDraft((prev) => prev ? { ...prev, primaryColor: storeThemePublished.primaryColor, secondaryColor: storeThemePublished.secondaryColor, priceColor: storeThemePublished.priceColor, discountColor: storeThemePublished.discountColor, hoverColor: storeThemePublished.hoverColor, backgroundColor: storeThemePublished.backgroundColor } : prev);
    setStoreThemeHasUnpublished(true);
    setStoreThemeOk("Colores restaurados desde produccion. Guarda borrador para conservarlos.");
  };

  const applyStoreThemeContrastSuggestions = () => {
    if (!storeThemeContrastSuggestions.nextTheme) return;
    setStoreThemeError(null);
    setStoreThemeDraft(storeThemeContrastSuggestions.nextTheme);
    setStoreThemeHasUnpublished(true);
    setStoreThemeOk("Aplicamos sugerencias de contraste manteniendo tonos cercanos a tu eleccion.");
  };

  return {
    storeThemeLoading, storeThemeSaving, storeThemePublishing, storeThemeRestoring,
    storeThemeError, storeThemeOk, storeThemePublished, storeThemeDraft, setStoreThemeDraft,
    storeThemeVersions, storeThemeUpdatedAt, storeThemeUpdatedBy,
    storeThemeHasUnpublished, setStoreThemeHasUnpublished,
    storeThemeAutosaveStatus, storeThemeAutosaveError, storeThemeHasLocalUnsavedChanges,
    storePreviewTheme, publicationStateLabel, storeThemeDiffRows,
    storeThemeChecklist, storeThemeChecklistBlockingIssues, storeThemeContrastSuggestions,
    storeThemeAssetLocalPreview, storeThemeAssetUploading, storeThemeAssetDragOver, setStoreThemeAssetDragOver,
    storeThemeAssetHint, storeThemeSelectedTemplate, setStoreThemeSelectedTemplate,
    storeThemePublishComment, setStoreThemePublishComment,
    latestPublishedVersion, saveStoreDraft, publishStoreTheme, restoreStoreVersion,
    discardStoreThemeChanges, applyStoreThemeTemplate, exportStoreThemeJson, importStoreThemeJson,
    handleStoreThemeAssetUpload, restoreStoreThemeColorsFromProduction,
    applyStoreThemeContrastSuggestions, setStoreThemeLocalPreview,
  };
}
