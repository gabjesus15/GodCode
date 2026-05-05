const tenantBaseDomain = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "")
  .replace(/^https?:\/\//i, "")
  .replace(/\/$/, "")
  .toLowerCase();

export function isMainDomain(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  // Desarrollo local: misma experiencia que godcode.me (landing en /).
  if (h === "127.0.0.1" || h === "localhost" || h === "www.localhost") return true;
  if (!tenantBaseDomain) return false;
  if (h === tenantBaseDomain || h === `www.${tenantBaseDomain}`) return true;
  if (tenantBaseDomain.startsWith("www.") && h === tenantBaseDomain.replace(/^www\./, ""))
    return true;
  return false;
}

export function getSubdomainFromHost(host: string): string | null {
  const h = host.split(":")[0].toLowerCase();
  if (!tenantBaseDomain || !h.endsWith(`.${tenantBaseDomain}`)) return null;
  const sub = h.slice(0, -(`.${tenantBaseDomain}`.length));
  if (!sub || sub === "www" || sub.includes(".")) return null;
  return sub;
}
