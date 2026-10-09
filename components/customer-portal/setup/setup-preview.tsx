"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { StoreThemeConfig } from "../shared/customer-account-types";

import { PHONE_SCREEN, PhoneFrame } from "./ui/phone-frame";

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
	maxScale,
}: {
	theme: StoreThemeConfig;
	menuSlug: string | null;
	customDomain: string | null;
	branchId: string | null;
	/** Cambia cuando se crean productos, para recargar el menú y verlos. */
	reloadKey?: number;
	maxScale?: number;
}) {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const [loaded, setLoaded] = useState(false);
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
		// Se descubre cuando el menú ya tiene el tema nuevo, para que no se vea el viejo un instante.
		retries.current.push(setTimeout(() => setLoaded(true), 450));
	}, [push]);
	useEffect(() => () => retries.current.forEach(clearTimeout), []);

	const background = theme.backgroundColor || "#111111";
	const ink = theme.surfaceScheme === "light" ? "dark" : "light";

	return (
		<PhoneFrame screenBackground={background} statusInk={ink} maxScale={maxScale}>
			{src ? (
				<iframe
					ref={iframeRef}
					title="Vista previa de tu menú"
					src={src}
					onLoad={onLoad}
					className="block border-0 transition-opacity duration-500"
					style={{ width: PHONE_SCREEN.width, height: PHONE_SCREEN.height - PHONE_SCREEN.statusBar, opacity: loaded ? 1 : 0 }}
				/>
			) : null}
			{!loaded ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 text-center" style={{ color: ink === "light" ? "rgba(255,255,255,0.7)" : "rgba(17,17,19,0.6)" }}>
					{menuSlug ? (
						<>
							<span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
							<span className="text-[15px]">Cargando tu menú…</span>
						</>
					) : (
						<span className="text-[15px] leading-relaxed">La vista previa aparece cuando tu tienda tenga dirección.</span>
					)}
				</div>
			) : null}
		</PhoneFrame>
	);
}
