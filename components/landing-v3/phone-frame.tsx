import Image from "next/image";

import { cn } from "@/utils/cn";

type PhoneFrameProps = {
	src: string;
	alt: string;
	className?: string;
	screenClassName?: string;
	priority?: boolean;
	imageFit?: "contain" | "cover";
	/** Muestra Dynamic Island y home indicator encima de la captura. */
	showSystemChrome?: boolean;
	/** Proporción ancho/alto de la captura. Por defecto 9/19.5 (iPhone). */
	aspectRatio?: number;
};

export function PhoneFrame({
	src,
	alt,
	className,
	screenClassName,
	priority,
	imageFit = "cover",
	showSystemChrome = true,
	aspectRatio = 9 / 19.5,
}: PhoneFrameProps) {
	return (
		<div className={cn("relative mx-auto w-full max-w-[280px]", className)}>
			{/* Sombra en suelo */}
			<div
				className="pointer-events-none absolute -bottom-5 left-[12%] right-[12%] -z-10 h-6 rounded-[100%] opacity-70 blur-xl"
				style={{ background: "rgba(0,0,0,0.9)" }}
			/>

			{/* Glow ambiental */}
			<div
				className="pointer-events-none absolute -inset-10 -z-10 rounded-[3.5rem] opacity-55 blur-3xl"
				style={{
					background:
						"radial-gradient(ellipse at center, rgba(124, 58, 237, 0.32) 0%, transparent 70%)",
				}}
			/>

			{/* Botones físicos */}
			<div className="absolute -left-[3px] top-[19%] z-20 h-6 w-[3px] rounded-l-[2px] bg-gradient-to-b from-[#5a5a5f] via-[#2e2e32] to-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />
			<div className="absolute -left-[3px] top-[26%] z-20 h-10 w-[3px] rounded-l-[2px] bg-gradient-to-b from-[#5a5a5f] via-[#2e2e32] to-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />
			<div className="absolute -left-[3px] top-[35%] z-20 h-10 w-[3px] rounded-l-[2px] bg-gradient-to-b from-[#5a5a5f] via-[#2e2e32] to-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />
			<div className="absolute -right-[3px] top-[28%] z-20 h-[52px] w-[3px] rounded-r-[2px] bg-gradient-to-b from-[#5a5a5f] via-[#2e2e32] to-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />

			{/* Chasis */}
			<div
				className="relative rounded-[2.85rem] p-[3.5px] shadow-[0_2px_1px_rgba(255,255,255,0.08)_inset,0_30px_70px_-15px_rgba(0,0,0,0.9),0_50px_100px_-25px_rgba(0,0,0,0.55)]"
				style={{
					background:
						"linear-gradient(155deg, #6b6b73 0%, #3f3f46 8%, #18181b 35%, #27272a 52%, #09090b 72%, #3f3f46 88%, #52525b 100%)",
				}}
			>
				{/* Banda antena superior */}
				<div className="pointer-events-none absolute inset-x-[18%] top-[7px] z-30 h-[2px] rounded-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

				<div className="rounded-[2.65rem] bg-[#030303] p-[8px] ring-1 ring-white/[0.07]">
					<div
						className={cn(
							"relative overflow-hidden rounded-[2.2rem] bg-black ring-1 ring-black/80",
							screenClassName,
						)}
						style={{ aspectRatio }}
					>
						<Image
							src={src}
							alt={alt}
							fill
							className={cn(
								imageFit === "contain"
									? "object-contain object-center"
									: "object-cover object-top",
							)}
							sizes="(max-width: 768px) 80vw, 340px"
							priority={priority}
						/>

						{/* Cristal */}
						<div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-white/[0.09] via-transparent to-transparent" />
						<div className="pointer-events-none absolute inset-0 z-20 rounded-[2.2rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" />
						<div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[18%] bg-gradient-to-l from-white/[0.03] to-transparent" />

						{showSystemChrome ? (
							<>
								<div className="absolute left-1/2 top-[9px] z-30 h-[25px] w-[28%] min-w-[68px] max-w-[96px] -translate-x-1/2 rounded-full bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.09),inset_0_1px_3px_rgba(0,0,0,0.9)]" />
								<div className="absolute bottom-[5px] left-1/2 z-30 h-[4px] w-[30%] -translate-x-1/2 rounded-full bg-white/30" />
							</>
						) : null}
					</div>
				</div>

				{/* Banda antena inferior */}
				<div className="pointer-events-none absolute inset-x-[22%] bottom-[7px] z-30 h-[2px] rounded-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
			</div>

			{/* Brillo lateral */}
			<div className="pointer-events-none absolute inset-y-[14%] right-[1px] z-10 w-[2px] rounded-full bg-gradient-to-b from-transparent via-white/12 to-transparent" />
		</div>
	);
}
