import Image from "next/image";

import type { LabsScreen } from "@/lib/labs/content";
import { cn } from "@/utils/cn";

/**
 * Marcos para las capturas reales de la home del estudio. Las capturas son pantallas de
 * Gcode POS y de los proyectos tal como se usan; el marco solo las presenta como lo que son:
 * un teléfono o una ventana de navegador.
 */

type FrameProps = {
	screen: LabsScreen;
	className?: string;
	/** Clases de la imagen (alto fijo cuando el marco recorta la captura). */
	imageClassName?: string;
	/** `sizes` de next/image: el ancho real con el que se dibuja. */
	sizes?: string;
};

/** Teléfono: borde oscuro y esquinas redondas; con `max-h` en `className` la captura se corta por abajo sin deformarse. Con `cut` sale por el borde inferior del bloque que lo contiene. */
export function PhoneFrame({ screen, className, imageClassName, sizes = "176px", cut = false }: FrameProps & { cut?: boolean }) {
	return (
		<div
			className={cn(
				"overflow-hidden border-[5px] border-[#15151a] bg-[#15151a] shadow-[0_30px_60px_-24px_rgba(20,8,90,0.6)]",
				cut ? "rounded-t-[1.6rem] border-b-0" : "rounded-[1.6rem]",
				className,
			)}
		>
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

/** Ventana de navegador: barra con tres puntos y, si se da, la dirección. */
export function BrowserFrame({ screen, address, className, imageClassName, sizes = "352px" }: FrameProps & { address?: string }) {
	return (
		<div className={cn("overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_40px_-24px_rgba(20,8,90,0.5)]", className)}>
			<div className="flex items-center gap-1.5 px-3 py-2">
				<span className="h-2 w-2 rounded-full bg-[#ff7a3d]" />
				<span className="h-2 w-2 rounded-full bg-[#ffd33d]" />
				<span className="h-2 w-2 rounded-full bg-[#22c58b]" />
				{address ? <span className="ml-2 flex-1 truncate rounded-full bg-[#f4f4f8] px-3 py-0.5 text-[10px] text-[#6b6b76]">{address}</span> : null}
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
