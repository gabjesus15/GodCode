"use client";

import { useCallback, useState } from "react";

import type { StoreThemeConfig } from "../shared/customer-account-types";

export function encodePreviewThemeParam(theme: StoreThemeConfig): string {
  try {
    return globalThis.btoa(JSON.stringify(theme));
  } catch {
    return "";
  }
}

export function StoreThemePreviewPanel({
  theme,
  companyName,
  previewUrl,
  hasUnpublishedChanges,
}: {
  theme: StoreThemeConfig;
  companyName: string;
  previewUrl: string | null;
  hasUnpublishedChanges: boolean;
}) {
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
      const params = new URLSearchParams();
      params.set("embedded_preview", "1");
      params.set("preview_device", previewDevice);
      if (withDraftTheme && encodedDraftTheme) {
        params.set("preview_theme", encodedDraftTheme);
      }
      return `${previewUrl}?${params.toString()}`;
    },
    [encodedDraftTheme, previewDevice, previewUrl],
  );
  const productionMenuUrl = buildPreviewUrl(false);
  const draftMenuUrl = buildPreviewUrl(true);
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
              <h4 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{displayName}</h4>
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

          {productionMenuUrl && draftMenuUrl ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Menú embebido. Puedes comparar producción vs borrador y cambiar dispositivo.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-zinc-300 p-1 dark:border-zinc-700">
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
                        onClick={() => setPreviewDevice(id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
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
                    onClick={() => setCompareMode((prev) => !prev)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {compareMode ? "Ver solo borrador" : "Comparar con producción"}
                  </button>

                  <a
                    href={draftMenuUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Abrir borrador
                  </a>
                </div>
              </div>

              <div className={`grid gap-4 ${shouldSplitFrames ? "xl:grid-cols-2" : "grid-cols-1"}`}>
                {compareMode ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Producción</p>
                    <div
                      className={`mx-auto overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-900 shadow-inner dark:border-zinc-700 ${frameWidthClass}`}
                    >
                      <iframe
                        title="Vista producción"
                        src={productionMenuUrl}
                        className={`${frameHeightClass} w-full bg-white`}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Borrador</p>
                  <div
                    className={`mx-auto overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-900 shadow-inner dark:border-zinc-700 ${frameWidthClass}`}
                  >
                    <iframe
                      title="Vista borrador"
                      src={draftMenuUrl}
                      className={`${frameHeightClass} w-full bg-white`}
                      loading="lazy"
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
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Tokens del tema</p>
              <button
                type="button"
                onClick={() => setShowTokens((prev) => !prev)}
                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {showTokens ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            {showTokens ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
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
