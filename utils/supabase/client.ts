import { createBrowserClient } from "@supabase/ssr";
import { getAuthCookieName, getAuthStorageKey, type SupabaseAuthScope } from "./auth-scope";

/** Misma normalización que `utils/supabase/server.ts` para evitar URLs mal formadas en Auth (p. ej. doble `/`). */
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** Rutas que comparten cookie `sb-super-admin-auth-token` (misma sesión que `/login`). */
const SUPER_ADMIN_PATHS = ["/dashboard", "/companies", "/plans", "/login", "/cuenta", "/post-login"];

/** Host parece tenant (subdominio), no el dominio principal del panel. */
function isLikelyTenantHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  const base = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0]
    ?.toLowerCase();
  if (base && h !== base && h !== `www.${base}` && h.endsWith(`.${base}`)) {
    return true;
  }
  if (h.endsWith(".localhost")) {
    const parts = h.split(".").filter(Boolean);
    return parts.length >= 2 && parts[0] !== "www";
  }
  return false;
}

/**
 * Heurística por path/host para los dos scopes de panel.
 *
 * NUNCA debe devolver `"menu-client"`: en dominio principal la ruta de cuenta es
 * `/{slug}/mi-cuenta` y no se puede distinguir de una ruta de tenant, así que sería
 * un falso sentido de seguridad. La sesión del cliente final se maneja entera en el
 * servidor (`/api/menu-account/*`), que escribe la cookie en la respuesta; el
 * navegador no instancia ningún cliente Supabase con ese scope.
 */
const resolveScope = (scope?: SupabaseAuthScope): SupabaseAuthScope => {
  if (scope) return scope;

  if (typeof window === "undefined") {
    return "super-admin";
  }

  const pathname = window.location.pathname.toLowerCase();
  const tenantHost = isLikelyTenantHost();
  // En subdominio tenant, /login es panel del local (no super-admin).
  if (pathname === "/login" && tenantHost) {
    return "tenant";
  }

  const isSuperAdminPath =
    pathname === "/login" || SUPER_ADMIN_PATHS.some((path) => pathname.startsWith(path));

  return isSuperAdminPath ? "super-admin" : "tenant";
};

const getCookieName = getAuthCookieName;
const getStorageKey = getAuthStorageKey;

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;
type ScopedClientStore = Partial<Record<SupabaseAuthScope, SupabaseBrowserClient>>;

const inMemoryClientStore: ScopedClientStore = {};

const getScopedClientStore = (): ScopedClientStore => {
  if (typeof window === "undefined") {
    return inMemoryClientStore;
  }

  const w = window as Window & {
    __saasGodcodeSupabaseClients?: ScopedClientStore;
  };

  if (!w.__saasGodcodeSupabaseClients) {
    w.__saasGodcodeSupabaseClients = {};
  }

  return w.__saasGodcodeSupabaseClients;
};

export function createSupabaseBrowserClient(scope?: SupabaseAuthScope) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const resolvedScope = resolveScope(scope);

  const scopedClientStore = getScopedClientStore();
  const existingClient = scopedClientStore[resolvedScope];

  if (existingClient) {
    return existingClient;
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: getStorageKey(resolvedScope),
    },
    cookieOptions: {
      name: getCookieName(resolvedScope),
    },
    isSingleton: true,
  });

  scopedClientStore[resolvedScope] = client;

  return client;
}
