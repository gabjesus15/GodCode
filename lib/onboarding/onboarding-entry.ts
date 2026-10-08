/**
 * Lo que trae el landing al alta: el plan que se eligió (`?plan=`) y el país (`?pais=`,
 * o el del visitante si no viene). Se guardan en la solicitud y llegan ya marcados al
 * elegir el plan, al publicar la tienda.
 */

/** Los países del paso del plan (mismo texto que guarda la solicitud). */
export const ONBOARDING_COUNTRIES = [
	"Venezuela",
	"Chile",
	"Colombia",
	"Argentina",
	"México",
	"Perú",
	"Ecuador",
	"España",
	"Estados Unidos",
] as const;

const ISO_TO_COUNTRY: Record<string, (typeof ONBOARDING_COUNTRIES)[number]> = {
	VE: "Venezuela",
	CL: "Chile",
	CO: "Colombia",
	AR: "Argentina",
	MX: "México",
	PE: "Perú",
	EC: "Ecuador",
	ES: "España",
	US: "Estados Unidos",
};

function fold(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toLowerCase();
}

/** Código ISO (`VE`) o nombre (`venezuela`, `México`) → país del alta; lo demás, `null`. */
export function resolveOnboardingCountry(raw: string | null | undefined): string | null {
	const value = String(raw ?? "").trim();
	if (!value || value.length > 40) return null;
	const iso = ISO_TO_COUNTRY[value.toUpperCase()];
	if (iso) return iso;
	const folded = fold(value);
	return ONBOARDING_COUNTRIES.find((country) => fold(country) === folded) ?? null;
}

/** Id de plan con forma válida (el servicio confirma que exista y esté a la venta). */
export function sanitizePlanHint(raw: string | null | undefined): string | null {
	const value = String(raw ?? "").trim();
	return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}
