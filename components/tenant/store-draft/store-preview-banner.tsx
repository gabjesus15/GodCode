"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Eye } from "lucide-react";

import { trackEvent } from "@/lib/analytics/track-event";

const SEEN_KEY = "gc_store_preview_seen";

const subscribeNothing = () => () => {};

function isEmbedded(): boolean {
	return window.self !== window.top || new URLSearchParams(window.location.search).has("embedded_preview");
}

/**
 * Barra fija arriba para el dueño que abre su tienda en vista previa: le recuerda que
 * nadie más la ve y lo lleva a publicarla. Empuja la tienda hacia abajo (ver
 * `tenant-base.css`) en vez de taparle la barra de navegación.
 *
 * No aparece dentro del asistente (iframe con `embedded_preview`): ahí ya se sabe.
 */
export function StorePreviewBanner({ publishHref }: { publishHref: string }) {
	// Solo en el navegador y fuera del asistente; en el servidor no se muestra.
	const visible = useSyncExternalStore(subscribeNothing, () => !isEmbedded(), () => false);

	useEffect(() => {
		if (!visible) return undefined;
		const root = document.documentElement;
		root.dataset.storePreview = "on";

		let firstView = true;
		try {
			firstView = !sessionStorage.getItem(SEEN_KEY);
			sessionStorage.setItem(SEEN_KEY, "1");
		} catch {
			// Sin sessionStorage se cuenta igual.
		}
		if (firstView) trackEvent("store_preview_view", { flow: "draft" });

		return () => {
			delete root.dataset.storePreview;
		};
	}, [visible]);

	if (!visible) return null;

	// Al body: dentro de la capa de contenido de la tienda queda debajo de su fondo fijo.
	return createPortal(
		<div
			role="region"
			aria-label="Vista previa de tu tienda"
			className="fixed inset-x-0 top-0 z-[10001] flex h-[var(--store-preview-h,48px)] items-center bg-[#0B0D12] text-white shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_24px_-12px_rgba(0,0,0,0.6)]"
		>
			{/* Relleno en línea: la hoja base de la tienda pone en cero el de todo. */}
			<div style={{ margin: "0 auto", paddingInline: "clamp(12px, 3vw, 20px)" }} className="flex w-full max-w-6xl items-center gap-3">
				<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
					<Eye className="h-3.5 w-3.5" aria-hidden />
				</span>
				<p className="min-w-0 flex-1 truncate text-[13px] leading-tight">
					<span className="font-semibold">Vista previa</span>
					<span className="text-white/60"><span className="hidden min-[400px]:inline">: tus clientes todavía no la ven</span></span>
				</p>
				<a
					href={publishHref}
					onClick={() => trackEvent("publish_click", { flow: "draft", from: "store_preview" })}
					style={{ paddingInline: 14 }}
					className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-slate-900 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D12]"
				>
					<span className="sm:hidden">Publicar</span>
					<span className="hidden sm:inline">Publicar mi tienda</span>
					<ArrowRight className="h-3.5 w-3.5" aria-hidden />
				</a>
			</div>
		</div>,
		document.body,
	);
}
