"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

import { postPreviewThemeToIframe } from "@/lib/store-theme/preview-theme-messaging";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { getTenantMenuPreviewUrl, mergeMenuPathQuery } from "@/utils/tenant-url";

interface BrandingPreviewProps {
  /** Slug público del local: la vista previa es su menú real, no una maqueta. */
  publicSlug: string;
  companyName: string;
  /** Tema publicado + cambios sin guardar; los colores se aplican al instante. */
  theme: Record<string, unknown>;
}

/**
 * Menú real del local en un iframe con el tema en borrador.
 *
 * Carga `/{slug}/menu` en el mismo host del panel (no el dominio propio): el menú
 * solo acepta el tema por `postMessage` si viene de su mismo origen.
 */
export function BrandingPreview({ publicSlug, companyName, theme }: BrandingPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  const menuUrl = useMemo(() => {
    const slug = publicSlug.trim();
    return slug ? getTenantMenuPreviewUrl(slug) : "";
  }, [publicSlug]);
  const iframeSrc = menuUrl ? mergeMenuPathQuery(menuUrl, { embedded_preview: "1", preview_device: "mobile" }) : "";
  const draftTheme = useMemo(() => normalizeStoreThemeConfig(theme, companyName), [theme, companyName]);

  const pushTheme = useCallback(() => {
    postPreviewThemeToIframe(iframeRef.current, draftTheme);
  }, [draftTheme]);

  useEffect(() => {
    if (loaded) pushTheme();
  }, [loaded, pushTheme]);

  if (!iframeSrc) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Este local aún no tiene dirección pública, así que no hay menú que mostrar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Vista previa del menú</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Su menú real; los cambios de marca se ven al instante.</p>
        </div>
        <a
          href={menuUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Abrir
        </a>
      </div>

      <div className="relative mx-auto h-[640px] w-full max-w-[390px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 dark:border-zinc-800">
        {!loaded ? (
          <div className="absolute inset-0 grid place-items-center text-xs text-zinc-400" role="status">
            Cargando menú…
          </div>
        ) : null}
        <iframe
          ref={iframeRef}
          title={`Vista previa del menú de ${companyName || publicSlug}`}
          src={iframeSrc}
          onLoad={() => {
            setLoaded(true);
            pushTheme();
          }}
          className={`h-full w-full transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </div>
  );
}
