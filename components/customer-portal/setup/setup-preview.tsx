"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import type { StoreThemeConfig } from "../shared/customer-account-types";

import { postPreviewThemeToIframe } from "@/lib/store-theme/preview-theme-messaging";
import { getTenantMenuPreviewUrl, mergeMenuPathQuery } from "@/utils/tenant-url";

/**
 * El menú real del negocio dentro de un teléfono, con el tema que el dueño va armando.
 * Es la misma vista previa de «Tienda»: la página del menú escucha el tema por
 * `postMessage` y se repinta sin recargar.
 */
const subscribeNothing = () => () => {};

export function SetupPreview({
	theme,
	menuSlug,
	customDomain,
	branchId,
	reloadKey = 0,
}: {
	theme: StoreThemeConfig;
	menuSlug: string | null;
	customDomain: string | null;
	branchId: string | null;
	/** Cambia cuando se crean productos, para recargar el menú y verlos. */
	reloadKey?: number;
}) {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	// La URL sale del origen de la ventana (mismo origen que /cuenta): solo en el navegador.
	const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
	const src = useMemo(() => {
		if (!menuSlug || !mounted) return null;
		const base = getTenantMenuPreviewUrl(menuSlug, customDomain, branchId);
		return base ? mergeMenuPathQuery(base, { embedded_preview: "1", preview_device: "mobile", r: String(reloadKey) }) : null;
	}, [menuSlug, customDomain, branchId, reloadKey, mounted]);

	const themeRef = useRef(theme);
	const push = useCallback(() => postPreviewThemeToIframe(iframeRef.current, themeRef.current), []);
	useEffect(() => {
		themeRef.current = theme;
		push();
	}, [theme, push]);

	// El menú escucha el tema recién cuando termina de hidratarse, que puede ser después del
	// `load` del iframe: se reenvía unas veces para no quedarse con el tema guardado.
	const retries = useRef<ReturnType<typeof setTimeout>[]>([]);
	const onLoad = useCallback(() => {
		retries.current.forEach(clearTimeout);
		push();
		retries.current = [300, 1000, 2500].map((ms) => setTimeout(push, ms));
	}, [push]);
	useEffect(() => () => retries.current.forEach(clearTimeout), []);

	return (
		<div className="mx-auto w-full max-w-[410px]">
			<div className="overflow-hidden rounded-[2.2rem] border-[10px] border-[#1d1d1f] bg-[#1d1d1f] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
				{src ? (
					<iframe ref={iframeRef} title="Vista previa de tu menú" src={src} onLoad={onLoad} className="h-[700px] w-full rounded-[1.5rem] bg-white" />
				) : (
					<div className="flex h-[700px] items-center justify-center rounded-[1.5rem] bg-white px-6 text-center text-sm text-[#6e6e73]">
						{menuSlug ? "Cargando tu menú…" : "La vista previa aparece cuando tu tienda tenga dirección."}
					</div>
				)}
			</div>
			<p className="mt-3 text-center text-xs text-[#86868b]">Así lo ven tus clientes en el teléfono.</p>
		</div>
	);
}
