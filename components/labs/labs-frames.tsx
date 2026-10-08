import Image from "next/image";
import { Lock } from "lucide-react";

import type { LabsScreen } from "@/lib/labs/content";
import { cn } from "@/utils/cn";

/**
 * Marcos realistas para las capturas de la home del estudio. Las capturas son pantallas de
 * Gcode POS y de los proyectos tal como se usan; el marco las presenta como lo que son: un
 * teléfono (cuerpo de titanio con borde biselado, botones, isla y reflejo de cristal), un portátil
 * (tapa, pantalla y base de aluminio) o una ventana de navegador de escritorio.
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
 * con `cut` el teléfono sale por el borde inferior del bloque que lo contiene (sin base).
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
			{/* Botones: silencio y volumen a la izquierda, encendido a la derecha. */}
			<span aria-hidden className="absolute -left-[3px] top-[12%] h-[4%] w-[3px] rounded-l-[2px] bg-[#2d2d33]" />
			<span aria-hidden className="absolute -left-[3px] top-[19%] h-[8%] w-[3px] rounded-l-[2px] bg-[#2d2d33]" />
			<span aria-hidden className="absolute -left-[3px] top-[29%] h-[8%] w-[3px] rounded-l-[2px] bg-[#2d2d33]" />
			<span aria-hidden className="absolute -right-[3px] top-[22%] h-[12%] w-[3px] rounded-r-[2px] bg-[#2d2d33]" />
			<div
				className={cn(
					"relative bg-[linear-gradient(160deg,#34343a_0%,#0c0c0f_38%,#101013_70%,#26262b_100%)] p-[7px] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.22),0_30px_60px_-24px_rgba(20,8,90,0.65)]",
					cut ? "rounded-t-[2.3rem] pb-0" : "rounded-[2.3rem]",
				)}
			>
				<div className={cn("relative overflow-hidden bg-black", cut ? "rounded-t-[1.85rem]" : "rounded-[1.85rem]", screenClassName)}>
					<Image
						src={screen.src}
						alt={screen.alt}
						width={screen.width}
						height={screen.height}
						sizes={sizes}
						className={cn("block w-full object-cover object-top", imageClassName)}
					/>
					{/* Isla dinámica y reflejo del cristal. */}
					<span aria-hidden className="absolute left-1/2 top-[8px] h-[15px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
					<span
						aria-hidden
						className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_26%,transparent_44%)]"
					/>
				</div>
			</div>
		</div>
	);
}

/**
 * Portátil: tapa con bisel negro y cámara, pantalla con reflejo y la base de aluminio con la muesca
 * para abrir. `screenClassName` admite un `max-h`; con `cut` la pantalla sale por el borde inferior
 * del bloque que la contiene y no se dibuja la base.
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
					"relative bg-[linear-gradient(180deg,#2e2e34_0%,#0c0c0f_14%,#0c0c0f_100%)] px-[2.4%] pt-[2.6%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_40px_80px_-30px_rgba(20,8,90,0.6)]",
					cut ? "rounded-t-[0.9rem]" : "rounded-t-[0.9rem] rounded-b-[0.4rem] pb-[2.2%]",
				)}
			>
				<span
					aria-hidden
					className="absolute left-1/2 top-[1.1%] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#1c2735] shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
				/>
				<div className={cn("relative overflow-hidden bg-black", cut ? "rounded-t-[0.3rem]" : "rounded-[0.3rem]", screenClassName)}>
					<Image
						src={screen.src}
						alt={screen.alt}
						width={screen.width}
						height={screen.height}
						sizes={sizes}
						className={cn("block w-full object-cover object-top", imageClassName)}
					/>
					<span
						aria-hidden
						className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.03)_30%,transparent_48%)]"
					/>
				</div>
			</div>
			{cut ? null : (
				<div
					aria-hidden
					className="relative -mx-[6%] h-[12px] rounded-b-[9px] bg-[linear-gradient(180deg,#eaeaee_0%,#c3c3ca_55%,#8f8f98_100%)] shadow-[0_14px_24px_-12px_rgba(0,0,0,0.55)]"
				>
					<span className="absolute left-1/2 top-0 h-[4px] w-[14%] -translate-x-1/2 rounded-b-[4px] bg-[#8f8f98]" />
				</div>
			)}
		</div>
	);
}

/** Ventana de navegador de escritorio: semáforo, barra de dirección con candado y la captura debajo. */
export function BrowserFrame({ screen, address, className, imageClassName, sizes = "352px" }: FrameProps & { address?: string }) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-t-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_30px_60px_-30px_rgba(0,0,0,0.55)]",
				className,
			)}
		>
			<div className="flex h-8 items-center gap-1.5 border-b border-black/[0.06] bg-[#f3f3f6] px-3">
				<span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]" />
				<span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]" />
				<span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]" />
				<span className="mx-auto flex h-5 w-1/2 items-center justify-center gap-1 truncate rounded-md bg-white px-2 text-[10px] text-[#6b6b76] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
					<Lock className="h-2.5 w-2.5 shrink-0" aria-hidden />
					<span className="truncate">{address ?? screen.address ?? ""}</span>
				</span>
				<span aria-hidden className="w-[38px] shrink-0" />
			</div>
			<Image
				src={screen.src}
				alt={screen.alt}
				width={screen.width}
				height={screen.height}
				sizes={sizes}
				className={cn("block w-full object-cover object-top", imageClassName)}
			/>
		</div>
	);
}
