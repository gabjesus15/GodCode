"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Monitor, Smartphone } from "lucide-react";

import { HomePageView } from "@/components/tenant/home/home-page-view";
import type { HomeViewModel } from "@/lib/tenant/home-page/resolve-home-page";

import "@/components/tenant/home/home-page.css";

type Device = "mobile" | "desktop";

const PHONE = { width: 375, height: 760 };
const DESKTOP = { width: 1280, height: 800 };
/** Aire alrededor del marco para que su sombra no se recorte. */
const SHADOW_ROOM = 16;

type HomePagePreviewProps = {
	model: HomeViewModel;
	publicSlug: string;
	/** URL pública del menú, para el QR de la vista de computador. */
	menuUrl: string;
	/** Ocupa todo el ancho disponible (hoja de vista previa en móvil). */
	fluid?: boolean;
};

/**
 * La portada real (el mismo componente que ve el cliente) dentro de un marco
 * de teléfono o de computador. Es `inert`: se mira, no se navega.
 */
export function HomePagePreview({ model, publicSlug, menuUrl, fluid = false }: HomePagePreviewProps) {
	const [device, setDevice] = useState<Device>("mobile");
	const boxRef = useRef<HTMLDivElement>(null);
	const [boxWidth, setBoxWidth] = useState(0);

	useEffect(() => {
		const box = boxRef.current;
		if (!box) return;
		const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
		observer.observe(box);
		return () => observer.disconnect();
	}, []);

	const frame = device === "mobile" ? PHONE : DESKTOP;
	// El teléfono se muestra a tamaño real si cabe; el computador siempre escalado.
	const scale = boxWidth > 0 ? Math.min(1, (boxWidth - SHADOW_ROOM * 2) / (frame.width + (device === "mobile" ? 20 : 0))) : 1;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<div className="grid grid-cols-2 gap-1 rounded-xl border border-[#e5e5ea] bg-white p-1" role="radiogroup" aria-label="Dispositivo de la vista previa">
					{(
						[
							["mobile", "Móvil", Smartphone],
							["desktop", "Computador", Monitor],
						] as const
					).map(([value, label, Icon]) => (
						<button
							key={value}
							type="button"
							role="radio"
							aria-checked={device === value}
							onClick={() => setDevice(value)}
							className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
								device === value ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73] hover:bg-[#f5f5f7]"
							}`}
						>
							<Icon className="h-3.5 w-3.5" aria-hidden />
							{label}
						</button>
					))}
				</div>
				<p className="text-[11px] text-[#6e6e73]">Así la ven tus clientes</p>
			</div>

			<div ref={boxRef} className={`flex justify-center ${fluid ? "" : "min-h-[200px]"}`}>
				{boxWidth > 0 ? (
					<div
						className="overflow-hidden"
						style={{
							width: frame.width * scale + (device === "mobile" ? 20 * scale : 0) + SHADOW_ROOM * 2,
							height: frame.height * scale + (device === "mobile" ? 20 * scale : 0) + SHADOW_ROOM * 4,
							padding: `${SHADOW_ROOM}px ${SHADOW_ROOM}px ${SHADOW_ROOM * 3}px`,
						}}
					>
						<div
							className={
								device === "mobile"
									? "overflow-hidden rounded-[46px] border-[10px] border-[#1d1d1f] bg-[#1d1d1f] shadow-[0_18px_32px_-18px_rgba(0,0,0,0.45)]"
									: "overflow-hidden rounded-xl border border-[#d2d2d7] bg-white shadow-[0_18px_32px_-18px_rgba(0,0,0,0.3)]"
							}
							style={{
								width: frame.width + (device === "mobile" ? 20 : 0),
								transform: `scale(${scale})`,
								transformOrigin: "top left",
							}}
						>
							<div
								className="overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
								style={{ width: frame.width, height: frame.height, borderRadius: device === "mobile" ? 36 : 0 } as CSSProperties}
							>
								<div style={{ "--gh-viewport-h": `${frame.height}px` } as CSSProperties}>
									<HomePageView model={model} publicSlug={publicSlug} preview previewMenuUrl={menuUrl} />
								</div>
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
