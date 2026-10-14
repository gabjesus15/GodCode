import type { Metadata } from "next";

import { LandingCountryPage, generateLandingCountryMetadata } from "@/components/landing-v3/country-page-route";

export function generateMetadata(): Promise<Metadata> {
	return generateLandingCountryMetadata("estados-unidos");
}

export default function EstadosUnidosPage() {
	return <LandingCountryPage slug="estados-unidos" />;
}
