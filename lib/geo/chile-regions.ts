/**
 * Regiones de Chile (nombres oficiales para sesgo en geocodificación).
 * Valor vacío = sin filtro por región.
 */

export const CHILE_REGION_OPTIONS: { value: string; label: string }[] = [
	{ value: "", label: "Todas las regiones" },
	{ value: "Región de Arica y Parinacota", label: "XV — Arica y Parinacota" },
	{ value: "Región de Tarapacá", label: "I — Tarapacá" },
	{ value: "Región de Antofagasta", label: "II — Antofagasta" },
	{ value: "Región de Atacama", label: "III — Atacama" },
	{ value: "Región de Coquimbo", label: "IV — Coquimbo" },
	{ value: "Región de Valparaíso", label: "V — Valparaíso" },
	{
		value: "Región Metropolitana de Santiago",
		label: "RM — Metropolitana de Santiago",
	},
	{ value: "Región del Libertador General Bernardo O'Higgins", label: "VI — O'Higgins" },
	{ value: "Región del Maule", label: "VII — Maule" },
	{ value: "Región de Ñuble", label: "XVI — Ñuble" },
	{ value: "Región del Biobío", label: "VIII — Biobío" },
	{ value: "Región de La Araucanía", label: "IX — La Araucanía" },
	{ value: "Región de Los Ríos", label: "XIV — Los Ríos" },
	{ value: "Región de Los Lagos", label: "X — Los Lagos" },
	{ value: "Región de Aysén del General Carlos Ibáñez del Campo", label: "XI — Aysén" },
	{
		value: "Región de Magallanes y de la Antártica Chilena",
		label: "XII — Magallanes",
	},
];
