import Image from "next/image";
import { BatteryFull, ChevronLeft, ChevronRight, Lock, Plus, Wifi } from "lucide-react";

import type { LabsScreen } from "@/lib/labs/content";
import { cn } from "@/utils/cn";

/**
 * Marcos de dispositivo dibujados en CSS con las proporciones de los equipos de Apple: iPhone 16 Pro
 * (banda de titanio, bisel negro, isla dinámica, botón de acción, volumen, encendido y control de
 * cámara) y MacBook Pro (pantalla de bisel fino con la muesca de la cámara, tapa y base de aluminio).
 * Las medidas van en `cqw`, porcentaje del ancho del propio marco, así que cada marco se dibuja igual a
 * cualquier tamaño. Las capturas de teléfono traen pintada el área segura (hora e iconos) a la altura
 * real de un iPhone; la isla la pone el marco, en su sitio. Apple publica biseles oficiales en PNG
 * (developer.apple.com/design/resources, «Product Bezels»): si se quieren usar, cambia solo este archivo.
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

const TITANIUM =
	"bg-[conic-gradient(from_200deg_at_50%_50%,#d2d2d7,#8f8f95_10%,#ebebee_22%,#9c9ca2_36%,#dcdce0_50%,#8a8a90_64%,#eeeef1_78%,#a2a2a8_90%,#d2d2d7)]";
const BUTTON_L = "bg-[linear-gradient(90deg,#66666c,#b7b7bd_55%,#85858b)]";
const BUTTON_R = "bg-[linear-gradient(270deg,#66666c,#b7b7bd_55%,#85858b)]";

/**
 * iPhone. `screenClassName` admite un `max-h` que corta la captura por abajo sin deformarla; con `cut`
 * el teléfono sale por el borde inferior del bloque que lo contiene.
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
		<div className={cn("relative [container-type:inline-size]", className)}>
			{/* Botones: acción, subir y bajar volumen a la izquierda; encendido y control de cámara a la derecha. */}
			<span aria-hidden className={cn("absolute -left-[0.9cqw] top-[17.5%] h-[3%] w-[1.1cqw] rounded-l-[0.5cqw]", BUTTON_L)} />
			<span aria-hidden className={cn("absolute -left-[0.9cqw] top-[23.5%] h-[6%] w-[1.1cqw] rounded-l-[0.5cqw]", BUTTON_L)} />
			<span aria-hidden className={cn("absolute -left-[0.9cqw] top-[31.5%] h-[6%] w-[1.1cqw] rounded-l-[0.5cqw]", BUTTON_L)} />
			<span aria-hidden className={cn("absolute -right-[0.9cqw] top-[26%] h-[9.5%] w-[1.1cqw] rounded-r-[0.5cqw]", BUTTON_R)} />
			<span aria-hidden className={cn("absolute -right-[0.7cqw] top-[42%] h-[5%] w-[0.9cqw] rounded-r-[0.4cqw]", BUTTON_R)} />
			{/* Banda de titanio */}
			<div
				className={cn(
					"relative p-[1.7cqw] shadow-[0_0_0_0.25cqw_rgba(0,0,0,0.28),0_40px_70px_-30px_rgba(0,0,0,0.6)]",
					TITANIUM,
					cut ? "rounded-t-[16cqw] pb-0" : "rounded-[16cqw]",
				)}
			>
				{/* Bisel negro */}
				<div
					className={cn(
						"relative bg-[#07070a] p-[2.3cqw] shadow-[inset_0_0_0_0.3cqw_rgba(255,255,255,0.07)]",
						cut ? "rounded-t-[14.5cqw] pb-0" : "rounded-[14.5cqw]",
					)}
				>
					{/* Pantalla */}
					<div className={cn("relative overflow-hidden bg-black", cut ? "rounded-t-[12.5cqw]" : "rounded-[12.5cqw]", screenClassName)}>
						<Image
							src={screen.src}
							alt={screen.alt}
							width={screen.width}
							height={screen.height}
							sizes={sizes}
							className={cn("block w-full object-cover object-top", imageClassName)}
						/>
						{/* Isla dinámica: 125 × 37 pt en una pantalla de 402 pt, a 11 pt del borde. */}
						<span aria-hidden className="absolute left-1/2 top-[2.5cqw] h-[8.5cqw] w-[28.5cqw] -translate-x-1/2 rounded-full bg-[#050507]" />
						{/* Reflejo del cristal, apenas. */}
						<span
							aria-hidden
							className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.02)_28%,transparent_42%)]"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Solo los menús que caben a la izquierda de la muesca: macOS nunca pone nada debajo de ella. */
const MAC_MENUS = ["Archivo", "Edición", "Visualización", "Historial", "Marcadores"];

/** La barra de menús de macOS, con Safari delante: la muesca cae sobre ella, como en un Mac de verdad. */
function MacMenuBar() {
	return (
		<div aria-hidden className="flex h-[2.4cqw] items-center gap-[1.4cqw] bg-[#ececf0] px-[1.4cqw] text-[1.15cqw] leading-none text-[#1d1d1f]">
			<svg viewBox="0 0 24 24" className="h-[1.5cqw] w-[1.5cqw] fill-current">
				<path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2-1.1 2.8-2.3.9-1.3 1.2-2.6 1.2-2.6s-2.4-.9-2.4-3.8zM14.1 5.9c.6-.8 1.1-1.9.9-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z" />
			</svg>
			<span className="flex max-w-[44%] items-center gap-[1.4cqw] overflow-hidden whitespace-nowrap">
				<span className="font-semibold">Safari</span>
				{MAC_MENUS.map((item) => (
					<span key={item}>{item}</span>
				))}
			</span>
			<span className="ml-auto flex items-center gap-[1cqw] whitespace-nowrap">
				<Wifi className="h-[1.4cqw] w-[1.4cqw]" strokeWidth={2.2} />
				<BatteryFull className="h-[1.5cqw] w-[1.5cqw]" strokeWidth={2} />
				<span>jue 9 oct</span>
				<span>9:41</span>
			</span>
		</div>
	);
}

/** La barra de Safari: semáforo, flechas y la dirección. */
function SafariBar({ address }: { address: string }) {
	return (
		<div aria-hidden className="flex h-[3.2cqw] items-center gap-[0.7cqw] border-b border-black/[0.08] bg-[#f6f6f8] px-[1.2cqw] text-[1.15cqw] leading-none text-[#6b6b76]">
			<span className="h-[1.1cqw] w-[1.1cqw] rounded-full bg-[#ff5f57]" />
			<span className="h-[1.1cqw] w-[1.1cqw] rounded-full bg-[#febc2e]" />
			<span className="h-[1.1cqw] w-[1.1cqw] rounded-full bg-[#28c840]" />
			<ChevronLeft className="ml-[1cqw] h-[1.5cqw] w-[1.5cqw]" strokeWidth={2.2} />
			<ChevronRight className="h-[1.5cqw] w-[1.5cqw]" strokeWidth={2.2} />
			<span className="mx-auto flex h-[2.1cqw] w-[42%] items-center justify-center gap-[0.5cqw] truncate rounded-[0.5cqw] bg-white px-[1cqw] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
				{address ? <Lock className="h-[1cqw] w-[1cqw] shrink-0" strokeWidth={2.2} /> : null}
				<span className="truncate text-[#1d1d1f]">{address}</span>
			</span>
			<Plus className="h-[1.5cqw] w-[1.5cqw]" strokeWidth={2.2} />
			<span className="h-[1.3cqw] w-[1.3cqw] rounded-[0.25cqw] border-[0.18cqw] border-current" />
		</div>
	);
}

/**
 * MacBook Pro de frente: canto de aluminio, bisel negro fino con la muesca de la cámara, la barra de
 * menús de macOS, Safari a pantalla completa con la captura, y la base. `screenClassName` admite un
 * `max-h`; con `cut` la pantalla sale por el borde inferior del bloque y no se dibuja la base.
 */
export function LaptopFrame({
	screen,
	address,
	className,
	imageClassName,
	screenClassName,
	sizes = "480px",
	cut = false,
}: FrameProps & { address?: string; screenClassName?: string; cut?: boolean }) {
	const shown = address ?? screen.address ?? "";
	return (
		<div className={cn("relative [container-type:inline-size]", className)}>
			<div
				className={cn(
					"relative bg-[linear-gradient(180deg,#d4d4d9,#9a9aa1_45%,#75757c)] p-[0.55cqw] shadow-[0_40px_70px_-34px_rgba(0,0,0,0.6)]",
					cut ? "rounded-t-[2.6cqw] pb-0" : "rounded-t-[2.6cqw] rounded-b-[1.6cqw]",
				)}
			>
				<div
					className={cn(
						"relative bg-[#0b0b0d] px-[1.6cqw] pt-[1.6cqw]",
						cut ? "rounded-t-[2.1cqw] pb-0" : "rounded-t-[2.1cqw] rounded-b-[1.2cqw] pb-[2.4cqw]",
					)}
				>
					<div className={cn("relative overflow-hidden bg-white", cut ? "rounded-t-[0.6cqw]" : "rounded-[0.6cqw]", screenClassName)}>
						<MacMenuBar />
						<SafariBar address={shown} />
						<Image
							src={screen.src}
							alt={screen.alt}
							width={screen.width}
							height={screen.height}
							sizes={sizes}
							className={cn("block w-full object-cover object-top", imageClassName)}
						/>
						{/* Muesca de la cámara, sobre la barra de menús. */}
						<span aria-hidden className="absolute left-1/2 top-0 h-[2.2cqw] w-[7.5cqw] -translate-x-1/2 rounded-b-[0.8cqw] bg-[#0b0b0d]" />
						<span
							aria-hidden
							className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.015)_32%,transparent_46%)]"
						/>
					</div>
				</div>
			</div>
			{cut ? null : (
				<div
					aria-hidden
					className="relative -mx-[7cqw] h-[2.6cqw] rounded-b-[1.4cqw] bg-[linear-gradient(180deg,#f3f3f5_0%,#d6d6da_28%,#b4b4ba_68%,#8e8e95_100%)] shadow-[0_20px_32px_-14px_rgba(0,0,0,0.5)]"
				>
					{/* Línea de unión con la tapa y la ranura para abrirla. */}
					<span className="absolute inset-x-0 top-0 h-[0.2cqw] bg-[#fafafb]" />
					<span className="absolute left-1/2 top-0 h-[0.8cqw] w-[13cqw] -translate-x-1/2 rounded-b-[0.6cqw] bg-[linear-gradient(180deg,#95959c,#c6c6cb)]" />
				</div>
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
				<span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
				<span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
				<span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
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
