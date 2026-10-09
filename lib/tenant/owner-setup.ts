import { readStoreDraft } from "./store-draft";

/**
 * «Configura tu tienda»: el asistente que guía al dueño la primera vez que entra a /cuenta
 * (logo, diseño del menú según su negocio, menú, datos del local y publicar).
 *
 * Lo único que se guarda del asistente es si el dueño lo terminó o lo saltó, en
 * `companies.theme_config.ownerSetup`. Publicar el tema conserva esa clave porque
 * `mergeThemeConfig` deja intactas las que no son del tema. El avance de cada paso sale
 * de los datos reales (logo, plantilla, productos, sucursal), no de un contador aparte.
 */

export const OWNER_SETUP_STEPS = ["marca", "diseno", "menu", "local", "publicar"] as const;
export type OwnerSetupStep = (typeof OWNER_SETUP_STEPS)[number];

export type OwnerSetupRecord = { finishedAt: string | null; skippedAt: string | null };

/** Días desde el alta en los que /cuenta abre el asistente sola si el dueño no lo cerró. */
export const OWNER_SETUP_AUTO_OPEN_DAYS = 30;

function ownerSetupObject(themeConfig: unknown): Record<string, unknown> | null {
	const raw =
		themeConfig && typeof themeConfig === "object" && !Array.isArray(themeConfig)
			? (themeConfig as Record<string, unknown>).ownerSetup
			: null;
	return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

export function readOwnerSetup(themeConfig: unknown): OwnerSetupRecord {
	const record = ownerSetupObject(themeConfig) ?? {};
	const asDate = (value: unknown) => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null);
	return { finishedAt: asDate(record.finishedAt), skippedAt: asDate(record.skippedAt) };
}

/**
 * /cuenta abre el asistente sola solo a negocios recién creados que lo armaron ellos mismos
 * y no lo terminaron ni lo saltaron: los que nacieron en vista previa («Arma y paga»,
 * `theme_config.storeDraft`) o los que ya tienen el asistente empezado (`ownerSetup` sin
 * terminar). Una tienda que creó el equipo no tiene ninguna de las dos marcas y entra
 * directo a su cuenta. Los que ya llevan tiempo lo encuentran en «Primeros pasos».
 */
export function shouldAutoOpenOwnerSetup(input: {
	themeConfig: unknown;
	companyCreatedAt: string | null | undefined;
	now?: Date;
}): boolean {
	const record = readOwnerSetup(input.themeConfig);
	if (record.finishedAt || record.skippedAt) return false;
	const selfServe = Boolean(readStoreDraft(input.themeConfig)) || ownerSetupObject(input.themeConfig) !== null;
	if (!selfServe) return false;
	const created = input.companyCreatedAt ? Date.parse(input.companyCreatedAt) : Number.NaN;
	if (Number.isNaN(created)) return false;
	const ageMs = (input.now ?? new Date()).getTime() - created;
	return ageMs >= 0 && ageMs <= OWNER_SETUP_AUTO_OPEN_DAYS * 24 * 60 * 60 * 1000;
}

/** Copia de `theme_config` con el asistente marcado como terminado o saltado. */
export function withOwnerSetupMark(themeConfig: unknown, action: "finish" | "skip", now = new Date()): Record<string, unknown> {
	const base =
		themeConfig && typeof themeConfig === "object" && !Array.isArray(themeConfig)
			? { ...(themeConfig as Record<string, unknown>) }
			: {};
	const current = readOwnerSetup(base);
	const iso = now.toISOString();
	base.ownerSetup = action === "finish" ? { ...current, finishedAt: iso } : { ...current, skippedAt: iso };
	return base;
}
