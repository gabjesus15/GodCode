import type { CSSProperties } from "react";

import { LABS_SHOWCASE } from "@/lib/labs/content";

import { LabsShowcase } from "./labs-showcase";

/** Bajo el titular del hero: la vitrina con un proyecto real a la vez (`LabsShowcase`, `LABS_SHOWCASE`). Entra después de los textos. */
export function LabsHeroVisual() {
	return (
		<div className="labs-rise mx-auto mt-14 max-w-6xl sm:mt-16" style={{ "--labs-i": 5 } as CSSProperties}>
			<LabsShowcase items={LABS_SHOWCASE} />
		</div>
	);
}
