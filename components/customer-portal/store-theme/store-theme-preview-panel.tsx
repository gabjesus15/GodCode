"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import type { StoreThemeConfig } from "../shared/customer-account-types";
import { encodePreviewThemeParam } from "@/lib/store-theme/preview-theme-codec";
import { postPreviewThemeToIframe } from "@/lib/store-theme/preview-theme-messaging";
import { mergeMenuPathQuery, getTenantMenuPreviewUrl } from "@/utils/tenant-url";

export { encodePreviewThemeParam };

/**
 * Los controles comparten un solo estilo: el anillo de foco visible faltaba en
 * todos ellos y el estado presionado no existía, así que el panel se navegaba a
 * ciegas con teclado y no acusaba recibo del clic.
 */
const CONTROL_CLASS =
  "rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-900";

export function StoreThemePreviewPanel({
  theme,
  companyName,
  menuSlug,
  customDomain,
  previewBranchId,
  hasUnpublishedChanges,
}: {
  theme: StoreThemeConfig;
  companyName: string;
  menuSlug: string | null;
  customDomain?: string | null;
  previewBranchId?: string | null;
  hasUnpublishedChanges: boolean;
}) {
  const previewUrl = useMemo(
    () => (menuSlug ? getTenantMenuPreviewUrl(menuSlug, customDomain, previewBranchId) : null),
    [menuSlug, customDomain, previewBranchId],
  );
  const draftIframeRef = useRef<HTMLIFrameElement | null>(null);
  const productionIframeRef = useRef<HTMLIFrameElement | null>(null);
  const tokensPanelId = useId();
  const displayName = theme.displayName.trim() || companyName;
  const tokenRows = [
    ["Primario", theme.primaryColor],
    ["Secundario", theme.secondaryColor],
    ["Precio", theme.priceColor],
    ["Descuento", theme.discountColor],
    ["Hover", theme.hoverColor],
    ["Fondo", theme.backgroundColor],
  ] as const;
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [compareMode, setCompareMode] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const statusTone = hasUnpublishedChanges
    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
    : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  const statusLabel = hasUnpublishedChanges ? "Borrador con cambios" : "Publicado al día";
  const encodedDraftTheme = encodePreviewThemeParam(theme);
  const buildPreviewUrl = useCallback(
    (withDraftTheme: boolean) => {
      if (!previewUrl) return null;
      const params: Record<string, string> = {
        embedded_preview: "1",
        preview_device: previewDevice,
      };
      if (withDraftTheme && encodedDraftTheme) {
        params.preview_theme = encodedDraftTheme;
      }
      return mergeMenuPathQuery(previewUrl, params);
    },
    [encodedDraftTheme, previewDevice, previewUrl],
  );
  /** URL estable del iframe: sin preview_theme para no recargar en cada cambio del editor. */
  const draftIframeSrc = previewUrl
    ? mergeMenuPathQuery(previewUrl, {
        embedded_preview: "1",
        preview_device: previewDevice,
      })
    : null;
  const draftExternalUrl = useMemo(() => {
    if (!previewUrl || !encodedDraftTheme) return null;
    return mergeMenuPathQuery(previewUrl, { preview_theme: encodedDraftTheme });
  }, [encodedDraftTheme, previewUrl]);
  const productionMenuUrl = buildPreviewUrl(false);

  const pushDraftThemeToIframe = useCallback(() => {
    postPreviewThemeToIframe(draftIframeRef.current, theme);
  }, [theme]);

  useEffect(() => {
    pushDraftThemeToIframe();
  }, [pushDraftThemeToIframe]);
  const frameWidthClass =
    previewDevice === "mobile" ? "max-w-[430px]" : previewDevice === "tablet" ? "max-w-[860px]" : "max-w-none";
  const frameHeightClass =
    previewDevice === "mobile" ? "h-[760px]" : previewDevice === "tablet" ? "h-[860px]" : "h-[720px]";
  const shouldSplitFrames = compareMode && previewDevice !== "mobile";

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Vista 1:1 del menú</p>
              <h4 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-zinc-900 dark:text-zinc-100">{displayName}</h4>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Render del menú real del tenant tal como lo ve el cliente final.
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusTone}`}
            >
              {statusLabel}
            </span>
          </div>

          {!previewUrl ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando vista previa del menú…</p>
          ) : productionMenuUrl && draftIframeSrc ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Menú embebido. Puedes comparar producción vs borrador y cambiar dispositivo.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div
                    role="group"
                    aria-label="Dispositivo de la vista previa"
                    className="inline-flex rounded-lg border border-zinc-300 p-1 dark:border-zinc-700"
                  >
                    {(
                      [
                        ["mobile", "Móvil"],
                        ["tablet", "Tablet"],
                        ["desktop", "Desktop"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={previewDevice === id}
                        onClick={() => setPreviewDevice(id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 dark:focus-visible:ring-offset-zinc-900 ${
                          previewDevice === id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-pressed={compareMode}
                    onClick={() => setCompareMode((prev) => !prev)}
                    className={CONTROL_CLASS}
                  >
                    {compareMode ? "Ver solo borrador" : "Comparar con producción"}
                  </button>

                  {/* Sin tema codificado no hay borrador que abrir: el enlace
                      apuntaba a "#" y parecía disponible. */}
                  {draftExternalUrl ? (
                    <a href={draftExternalUrl} target="_blank" rel="noreferrer" className={CONTROL_CLASS}>
                      Abrir borrador
                    </a>
                  ) : (
                    <span
                      className="cursor-not-allowed rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
                      title="Guarda un cambio para abrir el borrador en una pestaña"
                    >
                      Abrir borrador
                    </span>
                  )}
                </div>
              </div>

              <div className={`grid gap-4 ${shouldSplitFrames ? "xl:grid-cols-2" : "grid-cols-1"}`}>
                {compareMode ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                      Producción
                    </p>
                    <div
                      className={`mx-auto overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-900 shadow-inner dark:border-zinc-700 ${frameWidthClass}`}
                    >
                      <iframe
                        ref={productionIframeRef}
                        title="Vista producción"
                        src={productionMenuUrl}
                        className={`${frameHeightClass} w-full bg-white`}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                    Borrador
                  </p>
                  <div
                    className={`mx-auto overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-900 shadow-inner dark:border-zinc-700 ${frameWidthClass}`}
                  >
                    <iframe
                      ref={draftIframeRef}
                      title="Vista borrador"
                      src={draftIframeSrc}
                      className={`${frameHeightClass} w-full bg-white`}
                      onLoad={pushDraftThemeToIframe}
                    />
                  </div>
                </div>
              </div>

              {hasUnpublishedChanges ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Hay cambios sin publicar: revisa el comparador antes de publicar.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              No se pudo construir la URL del menú para esta empresa.
            </div>
          )}

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                Tokens del tema
              </p>
              <button
                type="button"
                aria-expanded={showTokens}
                aria-controls={tokensPanelId}
                onClick={() => setShowTokens((prev) => !prev)}
                className={CONTROL_CLASS}
              >
                {showTokens ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            {showTokens ? (
              <div id={tokensPanelId} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tokenRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/70"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        className="shrink-0 rounded-md border border-zinc-300 dark:border-zinc-700"
                        role="img"
                        aria-label={`${label} ${value}`}
                      >
                        <rect x="0" y="0" width="28" height="28" rx="6" fill={value} />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">{label}</p>
                        <p className="truncate font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
