import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import type { BusinessHoursWeek } from "@/lib/tenant/business-hours";

/**
 * Las llamadas del asistente a las rutas de /cuenta. Solo usa `fetch` y `FormData`, así que
 * una app (React Native) puede usar las mismas con su `baseUrl` y su sesión en `headers`.
 */

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type OwnerSetupLocalPatch = {
	id: string;
	whatsapp_url: string;
	instagram_url: string;
	address: string;
	/** `null` borra el horario; sin la clave, no se toca. */
	business_hours?: { enabled: boolean; timezone: string | null; week: BusinessHoursWeek } | null;
	/** `""` borra el texto del horario que muestra la tienda (va junto con `business_hours: null`). */
	schedule?: string;
};

export type OwnerSetupApi = {
	saveThemePatch(patch: Partial<StoreThemeConfig>): Promise<ApiResult<{ theme: StoreThemeConfig }>>;
	uploadLogo(file: Blob, fileName?: string): Promise<ApiResult<{ theme: StoreThemeConfig; signedUrl: string | null }>>;
	saveLocal(patch: OwnerSetupLocalPatch): Promise<ApiResult<null>>;
	publishTheme(comment: string): Promise<ApiResult<null>>;
	markSetup(action: "finish" | "skip"): Promise<ApiResult<null>>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type ThemeResponse = { error?: string; draft?: { theme?: StoreThemeConfig }; signedUrl?: string | null };

async function readJson<T>(res: Response): Promise<T> {
	return (await res.json().catch(() => ({}))) as T;
}

export function createOwnerSetupApi(options: { fetch?: FetchLike; baseUrl?: string; headers?: Record<string, string> } = {}): OwnerSetupApi {
	const baseUrl = options.baseUrl ?? "";
	const call: FetchLike = (path, init) =>
		(options.fetch ?? globalThis.fetch)(`${baseUrl}${path}`, { ...init, headers: { ...options.headers, ...init?.headers } });
	const json = (method: string, body: unknown): RequestInit => ({
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	async function attempt<T>(run: () => Promise<ApiResult<T>>, fallback: string): Promise<ApiResult<T>> {
		try {
			return await run();
		} catch {
			return { ok: false, error: `${fallback} Revisa tu conexión e intenta de nuevo.` };
		}
	}

	return {
		saveThemePatch: (patch) =>
			attempt(async () => {
				const res = await call("/api/customer-account/store-theme", json("PUT", { patch }));
				const data = await readJson<ThemeResponse>(res);
				if (!res.ok || !data.draft?.theme) return { ok: false, error: data.error || "No pudimos guardar el diseño." };
				return { ok: true, data: { theme: data.draft.theme } };
			}, "No pudimos guardar el diseño."),

		uploadLogo: (file, fileName = "logo") =>
			attempt(async () => {
				const form = new FormData();
				form.set("field", "logoUrl");
				form.set("file", file, fileName);
				const res = await call("/api/customer-account/store-theme/assets", { method: "POST", body: form });
				const data = await readJson<ThemeResponse>(res);
				if (!res.ok || !data.draft?.theme) return { ok: false, error: data.error || "No pudimos subir tu logo." };
				return { ok: true, data: { theme: data.draft.theme, signedUrl: data.signedUrl ?? null } };
			}, "No pudimos subir tu logo."),

		saveLocal: (patch) =>
			attempt(async () => {
				const res = await call("/api/customer-account/branches/contact", json("PATCH", patch));
				const data = await readJson<{ error?: string }>(res);
				return res.ok ? { ok: true, data: null } : { ok: false, error: data.error || "No pudimos guardar los datos del local." };
			}, "No pudimos guardar los datos del local."),

		publishTheme: (comment) =>
			attempt(async () => {
				const res = await call("/api/customer-account/store-theme/publish", json("POST", { comment, changedFields: [] }));
				const data = await readJson<{ error?: string }>(res);
				return res.ok ? { ok: true, data: null } : { ok: false, error: data.error || "No pudimos publicar." };
			}, "No pudimos publicar."),

		markSetup: (action) =>
			attempt(async () => {
				const res = await call("/api/customer-account/setup", json("POST", { action }));
				return res.ok ? { ok: true, data: null } : { ok: false, error: "No pudimos guardar tu avance." };
			}, "No pudimos guardar tu avance."),
	};
}
