/**
 * «Arma y paga»: la tienda nace en vista previa. El dueño la arma gratis y solo se vuelve
 * pública cuando paga un plan. Mientras tanto la ve únicamente él (con su sesión); el resto
 * ve «Esta tienda abre pronto», no entra al sitemap ni al directorio y lleva `noindex`.
 *
 * Se guarda en `theme_config.storeDraft` (como `ownerSetup` y `panelAccess`), sin columna
 * nueva. La empresa queda en `trial` sin vencimiento para que la RLS pública siga dejando
 * leer su menú (la vista previa usa la misma página que la tienda real); lo que la oculta
 * es esta marca. Al confirmarse el pago la suscripción pasa a `active` y la marca se cierra
 * con `openedAt`: desde ahí la tienda es pública aunque el cierre fallara a medias.
 */

export const STORE_DRAFT_KEY = "storeDraft";

/** Días desde que se creó el borrador: recordatorios, aviso de borrado y borrado. */
export const STORE_DRAFT_REMINDER_DAYS = [2, 7] as const;
export const STORE_DRAFT_NOTICE_DAY = 23;
export const STORE_DRAFT_PURGE_DAY = 30;

/** Lecturas de carta con IA que trae la vista previa (las que salieron bien). */
export const STORE_DRAFT_MENU_READS = 1;

export type StoreDraftRecord = {
	/** Cuándo se creó la tienda en vista previa. */
	since: string;
	/** Cuándo se pagó y se abrió al público. */
	openedAt?: string | null;
	/** Lecturas de carta con IA ya usadas en la vista previa. */
	menuReads?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** La marca tal como está guardada, o `null` si la tienda no nació como borrador. */
export function readStoreDraft(themeConfig: unknown): StoreDraftRecord | null {
	const raw = asRecord(asRecord(themeConfig)?.[STORE_DRAFT_KEY]);
	if (!raw) return null;
	const since = typeof raw.since === "string" ? raw.since : "";
	if (!since || Number.isNaN(Date.parse(since))) return null;
	const openedAt = typeof raw.openedAt === "string" && raw.openedAt ? raw.openedAt : null;
	const menuReads = Number(raw.menuReads);
	return { since, openedAt, menuReads: Number.isFinite(menuReads) && menuReads > 0 ? Math.floor(menuReads) : 0 };
}

export type StoreDraftCompany = {
	subscription_status?: string | null;
	theme_config?: unknown;
};

/**
 * ¿La tienda sigue en vista previa? Solo mientras esté en `trial` y sin abrir: si el equipo
 * la activa a mano o el pago la pasó a `active`, se ve aunque la marca quede.
 */
export function isStoreDraftPending(company: StoreDraftCompany | null | undefined): boolean {
	if (!company) return false;
	const draft = readStoreDraft(company.theme_config);
	if (!draft || draft.openedAt) return false;
	return String(company.subscription_status ?? "").trim().toLowerCase() === "trial";
}

/** `theme_config` de una tienda que nace en vista previa. */
export function withStoreDraft(themeConfig: Record<string, unknown>, now = new Date()): Record<string, unknown> {
	return { ...themeConfig, [STORE_DRAFT_KEY]: { since: now.toISOString() } satisfies StoreDraftRecord };
}

/** `theme_config` con la tienda ya abierta (se conserva cuándo nació, para las métricas). */
export function withStoreDraftOpened(themeConfig: unknown, now = new Date()): Record<string, unknown> {
	const base = { ...(asRecord(themeConfig) ?? {}) };
	const current = readStoreDraft(base);
	if (!current) return base;
	base[STORE_DRAFT_KEY] = { ...current, openedAt: current.openedAt ?? now.toISOString() };
	return base;
}

/** `theme_config` con una lectura de carta más contada. */
export function withStoreDraftMenuRead(themeConfig: unknown): Record<string, unknown> {
	const base = { ...(asRecord(themeConfig) ?? {}) };
	const current = readStoreDraft(base);
	if (!current) return base;
	base[STORE_DRAFT_KEY] = { ...current, menuReads: (current.menuReads ?? 0) + 1 };
	return base;
}

/** ¿Le quedan lecturas de carta gratis a esta vista previa? */
export function storeDraftHasMenuReads(themeConfig: unknown): boolean {
	const draft = readStoreDraft(themeConfig);
	if (!draft || draft.openedAt) return true;
	return (draft.menuReads ?? 0) < STORE_DRAFT_MENU_READS;
}

const DAY_MS = 86_400_000;

/** Días completos desde que nació el borrador (0 el mismo día). */
export function storeDraftAgeDays(draft: Pick<StoreDraftRecord, "since">, now = new Date()): number {
	return Math.floor((now.getTime() - Date.parse(draft.since)) / DAY_MS);
}

/** Fecha en que se borra el borrador si nadie lo publica. */
export function storeDraftPurgeDate(draft: Pick<StoreDraftRecord, "since">): Date {
	return new Date(Date.parse(draft.since) + STORE_DRAFT_PURGE_DAY * DAY_MS);
}

/** Qué ve quien abre la tienda: abierta, en vista previa o cerrada (vencida o suspendida). */
export type TenantPublicView = "open" | "draft" | "closed";
