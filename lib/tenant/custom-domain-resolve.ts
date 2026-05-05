/**
 * Resuelve public_slug (tenant) a partir del host de un dominio personalizado.
 * Orden: TENANT_CUSTOM_DOMAIN_MAP (JSON en env) → RPC Supabase (si existe) → filtro REST.
 */

const normalizeHostForLookup = (hostHeader: string | null): string | null => {
	if (!hostHeader) {
		return null;
	}
	let h = hostHeader.split(":")[0].toLowerCase();
	if (h.startsWith("www.")) {
		h = h.slice(4);
	}
	return h || null;
};

let cachedEnvMap: Record<string, string> | null = null;

const getEnvDomainSlugMap = (): Record<string, string> => {
	if (cachedEnvMap !== null) {
		return cachedEnvMap;
	}
	const raw = process.env.TENANT_CUSTOM_DOMAIN_MAP?.trim();
	if (!raw) {
		cachedEnvMap = {};
		return cachedEnvMap;
	}
	try {
		cachedEnvMap = JSON.parse(raw) as Record<string, string>;
	} catch {
		cachedEnvMap = {};
	}
	return cachedEnvMap;
};

const slugFromEnvMap = (hostname: string): string | null => {
	const map = getEnvDomainSlugMap();
	const direct = map[hostname];
	if (direct?.trim()) {
		return direct.trim();
	}
	const withWww = map[`www.${hostname}`];
	if (withWww?.trim()) {
		return withWww.trim();
	}
	return null;
};

type CacheEntry = { slug: string; expiresAt: number };
const lookupCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

const getCachedSlug = (hostname: string): string | null | undefined => {
	const entry = lookupCache.get(hostname);
	if (!entry) {
		return undefined;
	}
	if (Date.now() > entry.expiresAt) {
		lookupCache.delete(hostname);
		return undefined;
	}
	return entry.slug;
};

const setCachedSlug = (hostname: string, slug: string | null) => {
	lookupCache.set(hostname, { slug: slug ?? "", expiresAt: Date.now() + CACHE_TTL_MS });
};

async function fetchSlugFromSupabaseRpc(hostname: string): Promise<string | null> {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !anonKey) {
		return null;
	}
	const rpcUrl = `${supabaseUrl}/rest/v1/rpc/resolve_public_slug_by_custom_domain`;
	let res: Response;
	try {
		res = await fetch(rpcUrl, {
			method: "POST",
			headers: {
				apikey: anonKey,
				Authorization: `Bearer ${anonKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ p_host: hostname }),
		});
	} catch {
		return null;
	}
	if (!res.ok) {
		return null;
	}
	const data: unknown = await res.json();
	if (typeof data === "string" && data.trim()) {
		return data.trim();
	}
	return null;
}

async function fetchSlugFromSupabaseRest(hostname: string): Promise<string | null> {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !anonKey) {
		return null;
	}
	const nowIso = new Date().toISOString();
	const orParam = `(subscription_ends_at.is.null,subscription_ends_at.gt.${nowIso})`;
	const url = `${supabaseUrl}/rest/v1/companies?select=public_slug&custom_domain=eq.${encodeURIComponent(hostname)}&or=${encodeURIComponent(orParam)}&subscription_status=not.in.%28suspended%29&limit=1`;
	let res: Response;
	try {
		res = await fetch(url, {
			headers: {
				apikey: anonKey,
				Authorization: `Bearer ${anonKey}`,
				Accept: "application/json",
			},
		});
	} catch {
		return null;
	}
	if (!res.ok) {
		return null;
	}
	const rows = (await res.json()) as { public_slug: string | null }[];
	const slug = rows[0]?.public_slug;
	return slug && slug.trim() ? slug.trim() : null;
}

export { normalizeHostForLookup };

export async function resolveTenantSlugFromCustomDomainHost(
	hostHeader: string | null
): Promise<string | null> {
	const hostname = normalizeHostForLookup(hostHeader);
	if (!hostname) {
		return null;
	}

	const fromEnv = slugFromEnvMap(hostname);
	if (fromEnv) {
		return fromEnv;
	}

	const cached = getCachedSlug(hostname);
	if (cached !== undefined) {
		return cached || null;
	}

	let slug: string | null = await fetchSlugFromSupabaseRpc(hostname);
	if (!slug) {
		slug = await fetchSlugFromSupabaseRest(hostname);
	}

	setCachedSlug(hostname, slug);
	return slug;
}
