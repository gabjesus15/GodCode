import { LandingBrandMark } from "@/components/landing-v3/landing-brand-mark";

interface LandingLogoProps {
	className?: string;
	/** Fondos claros → C negra. Fondos oscuros → C blanca. */
	forceLightText?: boolean;
}

/** Logo de marca para onboarding y superficies claras/oscuras del marketing. */
export function LandingLogo({ className, forceLightText = false }: LandingLogoProps) {
	return (
		<span
			className={`inline-flex items-center ${className ?? ""}`}
			aria-label="Gcode"
		>
			<LandingBrandMark
				variant={forceLightText ? "onLight" : "onDark"}
				className="h-10"
			/>
		</span>
	);
}
