import type { Metadata } from "next";

import { LandingCountryPage, generateLandingCountryMetadata } from "@/components/landing-v3/country-page-route";

export function generateMetadata(): Promise<Metadata> {
	return generateLandingCountryMetadata("venezuela");
}

export default function VenezuelaPage() {
	return <LandingCountryPage slug="venezuela" />;
}
