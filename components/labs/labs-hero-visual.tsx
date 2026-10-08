import { LABS_HERO_SCREENS } from "@/lib/labs/content";

import { LabsHeroDeck } from "./labs-hero-deck";

/**
 * El escenario del hero: un gran panel violeta, como una lámina sobre otras dos de color, que hace de
 * bandeja del muestrario (`LabsHeroDeck`): cinco láminas de color con pantallas reales de lo que
 * construimos (`LABS_HERO_SCREENS`). Al hacer scroll el panel crece y la escena se acerca (labs.css).
 */
export function LabsHeroVisual() {
	return (
		<div className="labs-stage relative mx-auto mt-10 max-w-6xl sm:mt-12">
			{/* Las dos láminas de atrás, amarilla y rosa, giradas: la pila de la que sale el panel. */}
			<div aria-hidden className="labs-stage__back-l absolute inset-x-4 inset-y-0 hidden rounded-[3rem] bg-[#ffd33d] sm:block" />
			<div aria-hidden className="labs-stage__back-r absolute inset-x-4 inset-y-0 hidden rounded-[3rem] bg-[#ff5fa8] sm:block" />

			<div className="labs-stage__card relative overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,#6a5cff_0%,#4a2fd8_55%,#36219f_100%)] shadow-[0_60px_120px_-50px_rgba(58,33,184,0.75)] sm:rounded-[3rem]">
				<div className="labs-stage__inner relative h-[38rem] lg:h-[40rem]">
					{/* Textura de puntos y órbitas finas en el borde de la bandeja, como el fondo de la referencia. */}
					<span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(60%_60%_at_30%_80%,#000,transparent)]" />
					<span aria-hidden className="pointer-events-none absolute -left-[12%] -top-[30%] h-[34rem] w-[34rem] rounded-full border border-white/15" />
					<span aria-hidden className="pointer-events-none absolute -bottom-[40%] right-[6%] h-[30rem] w-[30rem] rounded-full border border-white/10" />
					<LabsHeroDeck screens={LABS_HERO_SCREENS} />
				</div>
			</div>
		</div>
	);
}
