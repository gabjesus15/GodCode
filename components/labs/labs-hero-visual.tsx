import type { CSSProperties } from "react";

import { LABS_HERO_SCREENS, type LabsScreen } from "@/lib/labs/content";
import { cn } from "@/utils/cn";

import { LaptopFrame, PhoneFrame } from "./labs-frames";

/**
 * El escenario del hero: un gran panel violeta, como una lámina sobre otras dos de color,
 * con formas abstractas y pantallas reales de lo que construimos (`LABS_HERO_SCREENS`: el menú
 * digital de un restaurante, un pedido online, el sitio de Gcode POS en un portátil, la caja del
 * local y los reportes, tal como los usan los clientes). Al hacer scroll la lámina crece y la escena se
 * acerca (labs.css).
 */

/** Dónde va cada teléfono en escritorio; en el teléfono forman una fila que se desliza con el dedo. */
const SCREEN_POSITIONS = [
	"lg:left-[6%] lg:top-[10%]",
	"lg:-bottom-[14%] lg:left-[19%]",
	"lg:left-1/2 lg:z-10 lg:-translate-x-1/2 lg:-bottom-[3%]",
	"lg:right-[6%] lg:top-[8%]",
	"lg:-bottom-[12%] lg:right-[19%]",
] as const;

function Screen({ order, screen, className }: { order: number; screen: LabsScreen; className?: string }) {
	const laptop = screen.frame === "laptop";
	return (
		<figure
			className={cn("labs-rise shrink-0 snap-center lg:absolute", laptop ? "w-72 lg:w-[27rem]" : "w-40", className)}
			style={{ "--labs-i": order } as CSSProperties}
		>
			<div className="labs-float">
				{screen.label ? (
					<figcaption className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">{screen.label}</figcaption>
				) : null}
				{laptop ? (
					<LaptopFrame screen={screen} sizes="(min-width: 1024px) 432px, 288px" />
				) : (
					<PhoneFrame screen={screen} sizes="160px" screenClassName="max-h-[20.5rem]" />
				)}
			</div>
		</figure>
	);
}

/** Forma abstracta que deriva despacio. `rot` es su giro base; `order` desfasa el ciclo. */
function Shape({ className, rot = 0, order = 0 }: { className: string; rot?: number; order?: number }) {
	return (
		<span
			aria-hidden
			className={cn("labs-drift pointer-events-none absolute block", className)}
			style={{ "--labs-rot": `${rot}deg`, "--labs-i": order } as CSSProperties}
		/>
	);
}

export function LabsHeroVisual() {
	return (
		<div className="labs-stage relative mx-auto mt-10 max-w-6xl sm:mt-12">
			{/* Las dos láminas de atrás, amarilla y rosa, giradas: la pila de la que sale el panel. */}
			<div aria-hidden className="labs-stage__back-l absolute inset-x-4 inset-y-0 hidden rounded-[3rem] bg-[#ffd33d] sm:block" />
			<div aria-hidden className="labs-stage__back-r absolute inset-x-4 inset-y-0 hidden rounded-[3rem] bg-[#ff5fa8] sm:block" />

			<div className="labs-stage__card relative overflow-hidden rounded-[3rem] bg-[linear-gradient(135deg,#6a5cff_0%,#4a2fd8_55%,#36219f_100%)] shadow-[0_60px_120px_-50px_rgba(58,33,184,0.75)]">
				<div className="labs-stage__inner relative h-[36rem] sm:h-[38rem] lg:h-[40rem]">
					{/* Textura de puntos y órbitas finas, como las del fondo de la referencia. */}
					<span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(60%_60%_at_30%_80%,#000,transparent)]" />
					<span aria-hidden className="pointer-events-none absolute -left-[12%] -top-[30%] h-[34rem] w-[34rem] rounded-full border border-white/15" />
					<span aria-hidden className="pointer-events-none absolute -bottom-[40%] right-[6%] h-[30rem] w-[30rem] rounded-full border border-white/10" />

					{/* Formas: una esfera cálida, un anillo rosa, una píldora amarilla y un cubo violeta, en los huecos que dejan los teléfonos. */}
					<Shape
						order={0}
						rot={0}
						className="left-[5%] top-[8%] h-28 w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe9a3,#ffb13d_55%,#e5651a)] shadow-[inset_-16px_-20px_36px_rgba(120,30,0,0.35),0_40px_60px_-30px_rgba(0,0,0,0.5)] sm:h-40 sm:w-40 lg:left-[19%] lg:-top-[6%]"
					/>
					<Shape
						order={1}
						rot={-20}
						className="right-[4%] top-[6%] h-28 w-28 rounded-full border-[18px] border-[#ff5fa8] [border-top-color:#ff8fc2] [border-bottom-color:#e23f8a] shadow-[0_30px_50px_-30px_rgba(0,0,0,0.6)] sm:h-44 sm:w-44 sm:border-[26px] lg:right-[17%] lg:-top-[12%]"
					/>
					<Shape
						order={2}
						rot={-18}
						className="left-[38%] top-[5%] hidden h-14 w-52 rounded-full bg-[linear-gradient(90deg,#ffd33d,#ffb13d)] shadow-[0_30px_50px_-30px_rgba(0,0,0,0.5)] sm:block lg:left-[45%] lg:top-[5%]"
					/>
					<Shape
						order={3}
						rot={12}
						className="left-[39%] top-[27%] hidden h-24 w-24 rounded-2xl bg-[linear-gradient(145deg,#a9a3ff,#5a4bff)] shadow-[inset_-10px_-12px_24px_rgba(20,8,90,0.35),0_30px_50px_-30px_rgba(0,0,0,0.5)] lg:block"
					/>
					<Shape order={4} rot={0} className="bottom-[26%] left-[4%] h-4 w-4 rounded-full bg-[#ffd33d] lg:bottom-[14%] lg:left-[24%]" />
					<Shape order={5} rot={0} className="right-[12%] top-[46%] h-3 w-3 rounded-full bg-white/80 lg:right-[24%] lg:top-[8%]" />

					{/* Las cuatro pantallas. En el teléfono van en una fila que se desliza con el dedo; en escritorio, repartidas por la escena. */}
					<div className="absolute inset-x-0 bottom-0 flex snap-x gap-5 overflow-x-auto px-6 pb-7 pt-4 [scrollbar-width:none] lg:contents">
						{LABS_HERO_SCREENS.map((screen, index) => (
							<Screen key={screen.src} order={index + 2} screen={screen} className={SCREEN_POSITIONS[index % SCREEN_POSITIONS.length]} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
