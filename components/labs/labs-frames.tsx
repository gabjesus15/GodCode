import Image from "next/image";
import { Lock } from "lucide-react";

import type { LabsScreen } from "@/lib/labs/content";
import { cn } from "@/utils/cn";

/**
 * Marcos para las capturas de la home del estudio, dibujados en CSS y lo más sobrios posible, como
 * los de las páginas de producto de las empresas grandes: un teléfono (bisel negro fino, sin botones
 * ni reflejos), un portátil (bisel fino y una base plana) y una ventana de navegador (barra clara con
 * tres puntos y la dirección). La protagonista es la pantalla, no el aparato.
 */

type FrameProps = {
	screen: LabsScreen;
	/** Clases del bloque exterior: posición y ancho. */
	className?: string;
	/** Clases de la imagen. */
	imageClassName?: string;
	/** `sizes` de next/image: el ancho real con el que se dibuja. */
	sizes?: string;
};

/**
 * Teléfono. `screenClassName` admite un `max-h` que corta la captura por abajo sin deformarla;
 * con `cut` el teléfono sale por el borde inferior del bloque que lo contiene.
 */
export function PhoneFrame({
	screen,
	className,
	imageClassName,
	screenClassName,
	sizes = "176px",
	cut = false,
}: FrameProps & { screenClassName?: string; cut?: boolean }) {
	return (
		<div className={cn("relative", className)}>
			<div
				className={cn(
					"relative bg-[#141417] p-[6px] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_28px_56px_-28px_rgba(0,0,0,0.5)]",
					cut ? "rounded-t-[2.1rem] pb-0" : "rounded-[2.1rem]",
				)}
			>
				<div className={cn("relative overflow-hidden bg-white", cut ? "rounded-t-[1.7rem]" : "rounded-[1.7rem]", screenClassName)}>
					<Image
						src={screen.src}
						alt={screen.alt}
						width={screen.width}
						height={screen.height}
						sizes={sizes}
						className={cn("block w-full object-cover object-top", imageClassName)}
					/>
					{/* La isla de la cámara, sobre la barra de estado de la captura. */}
					<span aria-hidden className="absolute left-1/2 top-[7px] h-[14px] w-[32%] -translate-x-1/2 rounded-full bg-[#141417]" />
				</div>
			</div>
		</div>
	);
}

/**
 * Portátil: bisel fino alrededor de la pantalla y una base plana. `screenClassName` admite un
 * `max-h`; con `cut` la pantalla sale por el borde inferior del bloque y no se dibuja la base.
 */
export function LaptopFrame({
	screen,
	className,
	imageClassName,
	screenClassName,
	sizes = "480px",
	cut = false,
}: FrameProps & { screenClassName?: string; cut?: boolean }) {
	return (
		<div className={cn("relative", className)}>
			<div
				className={cn(
					"relative bg-[#141417] px-[1.8%] pt-[1.8%] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_36px_70px_-34px_rgba(0,0,0,0.5)]",
					cut ? "rounded-t-[0.8rem]" : "rounded-t-[0.8rem] rounded-b-[0.35rem] pb-[1.8%]",
				)}
			>
				<div className={cn("relative overflow-hidden bg-white", cut ? "rounded-t-[0.3rem]" : "rounded-[0.3rem]", screenClassName)}>
					<Image
						src={screen.src}
						alt={screen.alt}
						width={screen.width}
						height={screen.height}
						sizes={sizes}
						className={cn("block w-full object-cover object-top", imageClassName)}
					/>
				</div>
			</div>
			{cut ? null : (
				<div aria-hidden className="relative -mx-[5%] h-[9px] rounded-b-[8px] bg-[#d9d9de] shadow-[0_10px_20px_-12px_rgba(0,0,0,0.4)]" />
			)}
		</div>
	);
}

/**
 * Ventana de navegador: barra clara con tres puntos y la dirección, y la captura debajo. Con `cut`
 * la ventana sale por el borde inferior del bloque; `screenClassName` admite un `max-h`.
 */
export function BrowserFrame({
	screen,
	address,
	className,
	imageClassName,
	screenClassName,
	sizes = "352px",
	cut = false,
}: FrameProps & { address?: string; screenClassName?: string; cut?: boolean }) {
	const shown = address ?? screen.address ?? "";
	return (
		<div
			className={cn(
				"overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_30px_60px_-30px_rgba(0,0,0,0.45)]",
				cut ? "rounded-t-xl" : "rounded-xl",
				className,
			)}
		>
			<div className="flex h-9 items-center gap-1.5 border-b border-black/[0.06] bg-[#f6f6f8] px-3.5">
				<span className="h-2.5 w-2.5 rounded-full bg-[#d6d6dc]" />
				<span className="h-2.5 w-2.5 rounded-full bg-[#d6d6dc]" />
				<span className="h-2.5 w-2.5 rounded-full bg-[#d6d6dc]" />
				<span className="mx-auto flex h-[22px] w-[46%] items-center justify-center gap-1.5 truncate rounded-md bg-white px-2.5 text-[11px] text-[#6b6b76] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
					{shown ? <Lock className="h-2.5 w-2.5 shrink-0" aria-hidden /> : null}
					<span className="truncate">{shown}</span>
				</span>
				<span aria-hidden className="w-[44px] shrink-0" />
			</div>
			<div className={cn("relative overflow-hidden", screenClassName)}>
				<Image
					src={screen.src}
					alt={screen.alt}
					width={screen.width}
					height={screen.height}
					sizes={sizes}
					className={cn("block w-full object-cover object-top", imageClassName)}
				/>
			</div>
		</div>
	);
}
