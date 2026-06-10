"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CheckCircle2, ChevronDown, Download, History, Upload, XCircle } from "lucide-react";
import Image from "next/image";

import { STORE_THEME_COLOR_FIELDS, STORE_THEME_COLOR_HELPERS, STORE_THEME_TEMPLATES } from "../../shared/customer-account-store-theme-constants";
import { StoreThemePreviewPanel } from "../../store-theme/store-theme-preview-panel";
import {
  StoreThemeNavbarPicker,
  StoreThemeProductCardPicker,
  StoreThemeProductDetailsPicker,
  StoreThemeProductGridPicker,
  useStoreThemeLayoutHandlers,
} from "../../store-theme/store-theme-layout-pickers";
import type { CompanySnapshot, StoreThemeAssetField, StoreThemeAutosaveStatus, StoreThemeConfig, StoreThemeResponse } from "../../shared/customer-account-types";
import { fmtDate } from "../../shared/customer-account-format";
import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";
import { Skeleton } from "../../ui/Skeleton";

export type StoreThemeChecklistItem = { id: string; title: string; ok: boolean; detail: string };
export type StoreThemeContrastChange = { key: keyof StoreThemeConfig; label: string; from: string; to: string; ratio: number | null; min: number };
export type StoreThemeDiffRow = { key: keyof StoreThemeConfig; label: string; draftValue: string; publishedValue: string };
export type StoreThemeVersionRow = StoreThemeResponse["versions"][number];

export type AccountTiendaTabProps = {
  company: CompanySnapshot;
  publicationStateLabel: string;
  storeThemeUpdatedAt: string | null;
  storeThemeUpdatedBy: string | null;
  latestPublishedVersion: StoreThemeVersionRow | null;
  storeThemeAutosaveStatus: StoreThemeAutosaveStatus;
  storeThemeHasLocalUnsavedChanges: boolean;
  storeThemeAutosaveError: string | null;
  storeThemeError: string | null;
  storeThemeOk: string | null;
  storeThemeLoading: boolean;
  storeThemeDraft: StoreThemeConfig | null;
  setStoreThemeDraft: Dispatch<SetStateAction<StoreThemeConfig | null>>;
  restoreStoreThemeColorsFromProduction: () => void;
  storeThemeSaving: boolean;
  storeThemePublishing: boolean;
  storeThemePublished: StoreThemeConfig | null;
  storeThemeAssetLocalPreview: Record<StoreThemeAssetField, string | null>;
  storeThemeAssetUploading: StoreThemeAssetField | null;
  storeThemeAssetDragOver: StoreThemeAssetField | null;
  setStoreThemeAssetDragOver: Dispatch<SetStateAction<StoreThemeAssetField | null>>;
  handleStoreThemeAssetUpload: (field: StoreThemeAssetField, file: File | null) => void;
  storeThemeAssetHint: Record<StoreThemeAssetField, string | null>;
  setStoreThemeHasUnpublished: Dispatch<SetStateAction<boolean>>;
  setStoreThemeLocalPreview: (field: StoreThemeAssetField, nextUrl: string | null) => void;
  storeThemeChecklist: StoreThemeChecklistItem[];
  storeThemeContrastSuggestions: { changes: StoreThemeContrastChange[] };
  applyStoreThemeContrastSuggestions: () => void;
  storeThemeDiffRows: StoreThemeDiffRow[];
  storeThemePublishComment: string;
  setStoreThemePublishComment: (v: string) => void;
  saveStoreDraft: () => void;
  publishStoreTheme: () => void;
  storeThemeHasUnpublished: boolean;
  storeThemeChecklistBlockingIssues: StoreThemeChecklistItem[];
  storePreviewTheme: StoreThemeConfig | null;
  storeThemeVersions: StoreThemeVersionRow[];
  restoreStoreVersion: (versionId: string) => Promise<void>;
  storeThemeRestoring: string | null;
  storeThemeSelectedTemplate: string;
  setStoreThemeSelectedTemplate: (v: string) => void;
  applyStoreThemeTemplate: () => void;
  importStoreThemeJson: (file: File | null) => Promise<void>;
  exportStoreThemeJson: () => void;
  discardStoreThemeChanges: () => void;
};

const autosaveLabels: Record<StoreThemeAutosaveStatus, string> = {
  idle:    "Sin cambios",
  pending: "Guardando en segundos…",
  saving:  "Guardando…",
  saved:   "Guardado",
  error:   "Error al guardar",
};

const autosaveVariant = (status: StoreThemeAutosaveStatus) => {
  if (status === "saved")   return "success";
  if (status === "error")   return "danger";
  if (status === "saving" || status === "pending") return "warning";
  return "neutral";
};

export function AccountTiendaTab({
  company,
  publicationStateLabel,
  storeThemeUpdatedAt,
  storeThemeUpdatedBy: _storeThemeUpdatedBy,
  latestPublishedVersion,
  storeThemeAutosaveStatus,
  storeThemeHasLocalUnsavedChanges,
  storeThemeAutosaveError,
  storeThemeError,
  storeThemeOk,
  storeThemeLoading,
  storeThemeDraft,
  setStoreThemeDraft,
  restoreStoreThemeColorsFromProduction,
  storeThemeSaving,
  storeThemePublishing,
  storeThemePublished,
  storeThemeAssetLocalPreview,
  storeThemeAssetUploading,
  storeThemeAssetDragOver,
  setStoreThemeAssetDragOver,
  handleStoreThemeAssetUpload,
  storeThemeAssetHint,
  setStoreThemeHasUnpublished,
  setStoreThemeLocalPreview,
  storeThemeChecklist,
  storeThemeContrastSuggestions,
  applyStoreThemeContrastSuggestions,
  storeThemeDiffRows,
  storeThemePublishComment,
  setStoreThemePublishComment,
  saveStoreDraft,
  publishStoreTheme,
  storeThemeHasUnpublished,
  storeThemeChecklistBlockingIssues: _storeThemeChecklistBlockingIssues,
  storePreviewTheme,
  storeThemeVersions,
  restoreStoreVersion,
  storeThemeRestoring,
  storeThemeSelectedTemplate,
  setStoreThemeSelectedTemplate,
  applyStoreThemeTemplate,
  importStoreThemeJson,
  exportStoreThemeJson,
  discardStoreThemeChanges,
}: AccountTiendaTabProps) {
  const [qualityOpen, setQualityOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [productCardOpen, setProductCardOpen] = useState(false);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [productGridOpen, setProductGridOpen] = useState(false);

  const busy = storeThemeLoading || storeThemeSaving || storeThemePublishing;
  const { setNavbarType, setProductCardStyle, setNavigationMode, setProductDetailsMode, setProductGridStyle } = useStoreThemeLayoutHandlers(setStoreThemeDraft);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-10 -mx-4 bg-[#fbfbfd]/95 px-4 pb-2 pt-1 backdrop-blur-md md:-mx-5 md:px-5 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#e5e5ea] bg-white px-3.5 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <PageHeader title="Tienda" />
            <Badge variant={autosaveVariant(storeThemeAutosaveStatus)} dot>
              {autosaveLabels[storeThemeAutosaveStatus]}
            </Badge>
            {storeThemeHasLocalUnsavedChanges && (
              <span className="text-[11px] text-amber-600 sm:text-xs">Cambios sin enviar</span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center sm:w-auto"
              onClick={discardStoreThemeChanges}
              disabled={busy || !storeThemePublished}
            >
              Descartar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center sm:w-auto"
              onClick={saveStoreDraft}
              loading={storeThemeSaving}
              disabled={busy}
            >
              Guardar borrador
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center sm:w-auto"
              onClick={publishStoreTheme}
              loading={storeThemePublishing}
              disabled={busy || !storeThemeHasUnpublished || storeThemeDiffRows.length === 0}
            >
              Publicar tienda
            </Button>
          </div>
        </div>
      </div>

      {/* Status feedback */}
      {storeThemeError       && <Alert variant="danger">{storeThemeError}</Alert>}
      {storeThemeAutosaveError && <Alert variant="warning">{storeThemeAutosaveError}</Alert>}
      {storeThemeOk          && <Alert variant="success">{storeThemeOk}</Alert>}

      {storeThemeLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!storeThemeLoading && (
        <div className="space-y-4">

          {/* Identidad */}
            <Card compact>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Identidad</p>
              <label className="block text-xs font-medium text-[#6e6e73]">
                Nombre visible
                <input
                  value={storeThemeDraft?.displayName ?? ""}
                  onChange={(e) => setStoreThemeDraft((prev) => prev ? { ...prev, displayName: e.target.value } : prev)}
                  placeholder={company.name}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
            </Card>

            {/* Layout y Navegación */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Diseño de Navegación y Catálogo</p>
              
              {/* Barra de navegación */}
              <Card noPadding>
                <button
                  type="button"
                  onClick={() => setNavbarOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-[#1d1d1f]"
                >
                  <span>Barra de navegación</span>
                  <ChevronDown className={`h-4 w-4 text-[#a1a1a6] transition-transform ${navbarOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {navbarOpen && (
                  <div className="space-y-4 px-5 pb-5">
                    <div>
                      <p className="mb-2 text-xs font-medium text-[#6e6e73]">Tipo de barra de navegación</p>
                      <StoreThemeNavbarPicker
                        value={storeThemeDraft?.navbarType}
                        onChange={setNavbarType}
                        disabled={busy}
                      />
                    </div>
                    <label className="block max-w-md text-xs font-medium text-[#6e6e73]">
                      Modo de navegación
                      <select
                        value={storeThemeDraft?.navigationMode ?? "scroll"}
                        onChange={(e) => setNavigationMode(e.target.value)}
                        disabled={busy}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                      >
                        <option value="scroll">Scroll continuo (secciones)</option>
                        <option value="pagination">Paginación (por categoría)</option>
                      </select>
                    </label>
                  </div>
                )}
              </Card>

              {/* Estilo de tarjeta de producto */}
              <Card noPadding>
                <button
                  type="button"
                  onClick={() => setProductCardOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-[#1d1d1f]"
                >
                  <span>Estilo de tarjeta de producto</span>
                  <ChevronDown className={`h-4 w-4 text-[#a1a1a6] transition-transform ${productCardOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {productCardOpen && (
                  <div className="px-5 pb-5">
                    <StoreThemeProductCardPicker
                      value={storeThemeDraft?.productCardStyle}
                      onChange={setProductCardStyle}
                      disabled={busy}
                    />
                  </div>
                )}
              </Card>

              {/* Modo de Detalles del Producto */}
              <Card noPadding>
                <button
                  type="button"
                  onClick={() => setProductDetailsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-[#1d1d1f]"
                >
                  <span>Modo de detalles del producto</span>
                  <ChevronDown className={`h-4 w-4 text-[#a1a1a6] transition-transform ${productDetailsOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {productDetailsOpen && (
                  <div className="px-5 pb-5">
                    <StoreThemeProductDetailsPicker
                      value={storeThemeDraft?.productDetailsMode}
                      onChange={setProductDetailsMode}
                      disabled={busy}
                    />
                  </div>
                )}
              </Card>

              {/* Distribución de cuadrícula de productos */}
              <Card noPadding>
                <button
                  type="button"
                  onClick={() => setProductGridOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-[#1d1d1f]"
                >
                  <span>Distribución de cuadrícula de productos</span>
                  <ChevronDown className={`h-4 w-4 text-[#a1a1a6] transition-transform ${productGridOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {productGridOpen && (
                  <div className="px-5 pb-5">
                    <StoreThemeProductGridPicker
                      value={storeThemeDraft?.productGridStyle}
                      onChange={setProductGridStyle}
                      disabled={busy}
                    />
                  </div>
                )}
              </Card>
            </div>

            {/* Colores */}
            <Card compact>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Colores</p>
                <Button variant="ghost" size="sm" onClick={restoreStoreThemeColorsFromProduction} disabled={busy || !storeThemePublished}>
                  Restaurar desde produccion
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {storeThemeDraft && STORE_THEME_COLOR_FIELDS.map(([key, label]) => (
                  <label key={key} className="block text-xs font-medium text-[#6e6e73]">
                    {label}
                    <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#d2d2d7] bg-white px-3 py-2">
                      <input
                        type="color"
                        value={storeThemeDraft[key]}
                        onChange={(e) => setStoreThemeDraft((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                        className="h-8 w-10 cursor-pointer rounded-md border border-[#d2d2d7] bg-transparent"
                      />
                      <span className="font-mono text-xs text-[#6e6e73]">{storeThemeDraft[key]}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#a1a1a6]">{STORE_THEME_COLOR_HELPERS[key]}</p>
                  </label>
                ))}
              </div>
            </Card>

            {/* Medios */}
            <Card compact>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Logo y fondo</p>
              <div className="space-y-3">
                {storeThemeDraft && (
                  <>
                    {(
                      [
                        ["logoUrl", "Logo", "Min 512x512, formato cuadrado recomendado."],
                        ["backgroundImageUrl", "Fondo", "Min 1600x900, panoramica horizontal recomendada."],
                      ] as const
                    ).map(([field, title, hint]) => {
                      const previewUrl = storeThemeAssetLocalPreview[field] || storeThemeDraft[field] || "";
                      const isUploading = storeThemeAssetUploading === field;
                      const isDragOver = storeThemeAssetDragOver === field;
                      return (
                        <div
                          key={field}
                          className={`rounded-xl border bg-white p-3 transition ${isDragOver ? "border-indigo-400 ring-2 ring-indigo-200" : "border-[#e5e5ea]"}`}
                          onDragOver={(e) => { e.preventDefault(); setStoreThemeAssetDragOver(field); }}
                          onDragLeave={(e) => { e.preventDefault(); setStoreThemeAssetDragOver((p) => p === field ? null : p); }}
                          onDrop={(e) => { e.preventDefault(); setStoreThemeAssetDragOver(null); void handleStoreThemeAssetUpload(field, e.dataTransfer.files?.[0] ?? null); }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-xs font-semibold text-[#1d1d1f]">{title}</p>
                            {isUploading && <span className="text-[10px] text-indigo-600">Subiendo…</span>}
                          </div>
                          {previewUrl ? (
                            <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg border border-[#e5e5ea]">
                              <Image src={previewUrl} alt={`Vista previa ${title}`} fill sizes="(max-width: 640px) 100vw, 380px" className="object-cover" unoptimized />
                            </div>
                          ) : (
                            <div className="mb-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-[#d2d2d7] bg-[#fbfbfd] text-xs text-[#a1a1a6]">
                              <Upload className="mr-1.5 h-4 w-4" /> Arrastra o selecciona
                            </div>
                          )}
                          <p className="mb-2 text-[10px] text-[#a1a1a6]">{hint}</p>
                          <div className="flex gap-2">
                            <label className="cursor-pointer rounded-lg border border-[#d2d2d7] px-3 py-1.5 text-xs font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]">
                              Subir
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { void handleStoreThemeAssetUpload(field, e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
                            </label>
                            {previewUrl && (
                              <button type="button" onClick={() => { setStoreThemeDraft((p) => p ? { ...p, [field]: "" } : p); setStoreThemeHasUnpublished(true); setStoreThemeLocalPreview(field, null); }} className="rounded-lg border border-[#d2d2d7] px-3 py-1.5 text-xs font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]">
                                Limpiar
                              </button>
                            )}
                          </div>
                          {storeThemeAssetHint[field] && <p className="mt-1.5 text-[10px] text-amber-600">{storeThemeAssetHint[field]}</p>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </Card>

            {/* Calidad y contraste (collapsible) */}
            <Card noPadding>
              <button
                type="button"
                onClick={() => setQualityOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-[#1d1d1f]"
              >
                <span>Calidad y contraste</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#a1a1a6]">
                    {storeThemeChecklist.filter((i) => i.ok).length}/{storeThemeChecklist.length} OK
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#a1a1a6] transition-transform ${qualityOpen ? "rotate-180" : ""}`} aria-hidden />
                </div>
              </button>
              {qualityOpen && (
                <div className="space-y-3 px-5 pb-5">
                  <div className="space-y-1.5">
                    {storeThemeChecklist.map((item) => (
                      <div key={item.id} className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${item.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                        {item.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}
                        <div><p className="font-semibold text-[#1d1d1f]">{item.title}</p><p className="text-[#6e6e73]">{item.detail}</p></div>
                      </div>
                    ))}
                  </div>
                  {storeThemeContrastSuggestions.changes.length > 0 && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold text-indigo-700">Sugerencias de contraste</p>
                        <Button variant="secondary" size="sm" onClick={applyStoreThemeContrastSuggestions}>Aplicar todas</Button>
                      </div>
                      {storeThemeContrastSuggestions.changes.map((c) => (
                        <div key={c.key} className="mt-1.5 rounded-lg border border-indigo-200 bg-white p-2 text-xs">
                          <p className="font-medium text-[#1d1d1f]">{c.label}: <span className="font-mono">{c.from}</span> → <span className="font-mono">{c.to}</span></p>
                          <p className="text-[#6e6e73]">Ratio {c.ratio?.toFixed(2) ?? "-"} (min {c.min.toFixed(1)})</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {storeThemeDiffRows.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-[#a1a1a6] uppercase tracking-[0.12em]">Diferencias vs produccion</p>
                      <div className="space-y-1">
                        {storeThemeDiffRows.map((row) => (
                          <div key={row.key} className="rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] p-3 text-xs">
                            <p className="font-semibold text-[#1d1d1f]">{row.label}</p>
                            <p className="text-[#6e6e73]">Produccion: <span className="font-mono">{row.publishedValue || "-"}</span></p>
                            <p className="text-[#1d1d1f]">Borrador: <span className="font-mono">{row.draftValue || "-"}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Comentario de publicacion</label>
                    <textarea
                      value={storeThemePublishComment}
                      onChange={(e) => setStoreThemePublishComment(e.target.value)}
                      rows={2}
                      maxLength={300}
                      placeholder="Ej: ajuste de paleta para campana de verano"
                      className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Versiones publicadas */}
            <Card noPadding>
              <button
                type="button"
                onClick={() => setVersionsOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-[#1d1d1f]"
              >
                <span className="flex items-center gap-2"><History className="h-4 w-4 text-[#a1a1a6]" />Versiones publicadas</span>
                <ChevronDown className={`h-4 w-4 text-[#a1a1a6] transition-transform ${versionsOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {versionsOpen && (
                <div className="space-y-2 px-5 pb-5">
                  {storeThemeVersions.length === 0 ? (
                    <EmptyState icon={History} title="Sin versiones" description="Aun no hay versiones publicadas." />
                  ) : storeThemeVersions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e5ea] px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-[#1d1d1f]">{v.theme.displayName || company.name}</p>
                        <p className="text-xs text-[#a1a1a6]">{fmtDate(v.createdAt, company.timezone)} · {v.createdByEmail ?? "sistema"}</p>
                      </div>
                      <Button variant="secondary" size="sm" loading={storeThemeRestoring === v.id} onClick={() => void restoreStoreVersion(v.id)} disabled={storeThemeLoading}>
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Avanzado */}
            <Card noPadding>
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-[#1d1d1f]"
              >
                <span>Opciones avanzadas</span>
                <ChevronDown className={`h-4 w-4 text-[#a1a1a6] transition-transform ${advancedOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {advancedOpen && (
                <div className="space-y-4 px-5 pb-5">
                  <div>
                    <label htmlFor="store-theme-template" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Plantillas</label>
                    <div className="flex gap-2">
                      <select
                        id="store-theme-template"
                        value={storeThemeSelectedTemplate}
                        onChange={(e) => setStoreThemeSelectedTemplate(e.target.value)}
                        className="h-9 flex-1 rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        {STORE_THEME_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <Button variant="secondary" size="sm" onClick={applyStoreThemeTemplate}>Aplicar</Button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">JSON</p>
                    <div className="flex gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#d2d2d7] px-3 py-2 text-xs font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]">
                        <Upload className="h-3.5 w-3.5" /> Importar
                        <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void importStoreThemeJson(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
                      </label>
                      <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={exportStoreThemeJson} disabled={!storeThemeDraft}>
                        Exportar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>

          {/* ── Preview (below controls) ── */}
          <aside className="space-y-4">
            <Card compact>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Vista previa</p>
              {storePreviewTheme ? (
                <StoreThemePreviewPanel
                  theme={storePreviewTheme}
                  companyName={company.name}
                  previewUrl={company.publicSlug ? `/${company.publicSlug}/menu` : null}
                  hasUnpublishedChanges={storeThemeHasUnpublished}
                />
              ) : (
                <p className="text-sm text-[#a1a1a6]">Cargando vista previa…</p>
              )}
            </Card>

            <Card compact>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-[#a1a1a6]">Estado</p><p className="mt-0.5 font-medium text-[#1d1d1f]">{publicationStateLabel}</p></div>
                <div><p className="text-[#a1a1a6]">Ultima edicion</p><p className="mt-0.5 font-medium text-[#1d1d1f]">{storeThemeUpdatedAt ? fmtDate(storeThemeUpdatedAt, company.timezone) : "-"}</p></div>
                <div><p className="text-[#a1a1a6]">Ultima publicacion</p><p className="mt-0.5 font-medium text-[#1d1d1f]">{latestPublishedVersion ? fmtDate(latestPublishedVersion.createdAt, company.timezone) : "-"}</p></div>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
