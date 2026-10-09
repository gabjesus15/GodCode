"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/utils/cn";

/** Pantalla de un teléfono de 390×844 (el ancho con el que se ve el menú en un iPhone). */
export const PHONE_SCREEN = { width: 390, height: 844, statusBar: 50 } as const;
const RIM = 3;
const BEZEL = 9;
const DEVICE = { width: PHONE_SCREEN.width + (RIM + BEZEL) * 2, height: PHONE_SCREEN.height + (RIM + BEZEL) * 2 };

function StatusBar({ ink }: { ink: "light" | "dark" }) {
	const color = ink === "light" ? "#ffffff" : "#111113";
	return (
		<div className="absolute inset-x-0 top-0 z-10 flex h-[50px] items-center justify-between px-[34px] pt-[6px]" style={{ color }} aria-hidden>
			<span className="text-[16px] font-semibold tracking-[-0.02em] tabular-nums">9:41</span>
			<span className="flex items-center gap-[6px]">
				<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
					<rect x="0" y="8" width="3" height="4" rx="1" />
					<rect x="5" y="5.5" width="3" height="6.5" rx="1" />
					<rect x="10" y="3" width="3" height="9" rx="1" />
					<rect x="15" y="0" width="3" height="12" rx="1" />
				</svg>
				<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
					<path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .6C5.2.6 2.7 1.7.8 3.5L2 4.8a8.5 8.5 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4.2c-1.8 0-3.4.7-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.6c-.5 0-1 .2-1.3.5L8 11.4l1.3-1.3c-.3-.3-.8-.5-1.3-.5Z" />
				</svg>
				<svg width="27" height="13" viewBox="0 0 27 13" fill="none">
					<rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="currentColor" strokeOpacity="0.4" />
					<rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" />
					<path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="currentColor" fillOpacity="0.45" />
				</svg>
			</span>
		</div>
	);
}

/**
 * Un teléfono que se achica para entrar en su contenedor (por ancho y por alto). Lo de
 * adentro siempre mide 390px de ancho, así el menú se ve igual que en un iPhone.
 */
export function PhoneFrame({
	children,
	screenBackground,
	statusInk,
	maxScale = 1,
	className,
}: {
	children: ReactNode;
	/** Color detrás de la barra de estado (el fondo del menú). */
	screenBackground: string;
	statusInk: "light" | "dark";
	maxScale?: number;
	className?: string;
}) {
	const box = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.6);

	useLayoutEffect(() => {
		const element = box.current;
		if (!element) return;
		const fit = () => {
			const { width, height } = element.getBoundingClientRect();
			const byWidth = width / DEVICE.width;
			const byHeight = height > 0 ? height / DEVICE.height : byWidth;
			setScale(Math.max(0.3, Math.min(byWidth, byHeight, maxScale)));
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(element);
		return () => observer.disconnect();
	}, [maxScale]);

	return (
		<div ref={box} className={cn("flex h-full w-full items-center justify-center", className)}>
			<div className="relative shrink-0" style={{ width: DEVICE.width * scale, height: DEVICE.height * scale }}>
				<div
					className="absolute left-0 top-0 origin-top-left"
					style={{ width: DEVICE.width, height: DEVICE.height, transform: `scale(${scale})` }}
				>
					{/* Botones laterales */}
					<span aria-hidden className="absolute -left-[3px] top-[150px] h-[30px] w-[4px] rounded-l-[2px] bg-[#2a2a2e]" />
					<span aria-hidden className="absolute -left-[3px] top-[205px] h-[58px] w-[4px] rounded-l-[2px] bg-[#2a2a2e]" />
					<span aria-hidden className="absolute -left-[3px] top-[275px] h-[58px] w-[4px] rounded-l-[2px] bg-[#2a2a2e]" />
					<span aria-hidden className="absolute -right-[3px] top-[235px] h-[92px] w-[4px] rounded-r-[2px] bg-[#2a2a2e]" />

					<div
						className="relative h-full w-full rounded-[64px]"
						style={{
							padding: RIM,
							background: "linear-gradient(150deg,#5a5a61 0%,#1d1d21 20%,#0b0b0d 50%,#26262a 80%,#5c5c63 100%)",
							boxShadow: "0 60px 120px -40px rgba(17,17,19,0.5), 0 24px 48px -28px rgba(17,17,19,0.55)",
						}}
					>
						<div className="relative h-full w-full rounded-[61px] bg-[#050506]" style={{ padding: BEZEL }}>
							<div className="relative h-full w-full overflow-hidden rounded-[52px]" style={{ background: screenBackground }}>
								<StatusBar ink={statusInk} />
								<span aria-hidden className="absolute left-1/2 top-[11px] z-20 h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black" />
								<div className="absolute inset-x-0 bottom-0" style={{ top: PHONE_SCREEN.statusBar }}>
									{children}
								</div>
								<span
									aria-hidden
									className="pointer-events-none absolute bottom-[8px] left-1/2 z-20 h-[5px] w-[134px] -translate-x-1/2 rounded-full"
									style={{ background: statusInk === "light" ? "rgba(255,255,255,0.75)" : "rgba(17,17,19,0.75)" }}
								/>
								<span
									aria-hidden
									className="pointer-events-none absolute inset-0 z-20 rounded-[52px] bg-[linear-gradient(118deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0)_28%)]"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
