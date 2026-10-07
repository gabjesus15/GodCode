/**
 * El sistema visual de «Configura tu tienda» en un solo lugar. La web lo usa como
 * variables CSS (`--su-*`) y una app puede importar los mismos valores.
 */
export const SETUP_TOKENS = {
	color: {
		canvas: "#f6f6f8",
		surface: "#ffffff",
		surfaceSunken: "#f2f2f5",
		ink: "#111113",
		ink2: "#3a3a3f",
		muted: "#6b6b73",
		subtle: "#9a9aa2",
		line: "#e8e8ec",
		lineStrong: "#d5d5db",
		/** Acento de Gcode (el mismo del logo). */
		accent: "#4f5bff",
		accentHover: "#3f4af0",
		accentSoft: "#eef0ff",
		accentInk: "#ffffff",
		success: "#16a34a",
		successSoft: "#e8f8ee",
		warning: "#b45309",
		warningSoft: "#fff6e5",
		danger: "#dc2626",
		dangerSoft: "#fdecec",
		whatsapp: "#25d366",
	},
	radius: { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
	/** Escala de espacios en px (múltiplos de 4). */
	space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
	/** Alto de los controles táctiles: nunca menos de 44px. */
	control: { sm: 36, md: 44, lg: 52 },
	shadow: {
		card: "0 1px 2px rgba(17,17,19,0.04), 0 2px 8px -2px rgba(17,17,19,0.06)",
		raised: "0 2px 4px rgba(17,17,19,0.04), 0 12px 32px -12px rgba(17,17,19,0.18)",
		focus: "0 0 0 4px rgba(79,91,255,0.18)",
	},
	motion: {
		fast: 0.16,
		base: 0.28,
		slow: 0.45,
		/** Salida suave tipo iOS. */
		ease: [0.22, 1, 0.36, 1] as const,
	},
} as const;

const kebab = (value: string) => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** Las variables CSS para la raíz del asistente. */
export function setupCssVariables(): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const [name, value] of Object.entries(SETUP_TOKENS.color)) vars[`--su-${kebab(name)}`] = value;
	for (const [name, value] of Object.entries(SETUP_TOKENS.radius)) vars[`--su-radius-${name}`] = `${value}px`;
	for (const [name, value] of Object.entries(SETUP_TOKENS.shadow)) vars[`--su-shadow-${name}`] = value;
	return vars;
}
