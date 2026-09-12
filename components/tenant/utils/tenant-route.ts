const TENANT_BASE_ROUTES = new Set(["menu", "login", "admin", "mi-cuenta"]);

const splitPathAndSuffix = (value: string) => {
  const match = value.match(/^([^?#]*)(.*)$/);
  if (!match) return { path: value, suffix: "" };
  return { path: match[1], suffix: match[2] };
};

export const getTenantPrefixFromPathname = (pathname: string) => {
  const safePathname = String(pathname || "/").split(/[?#]/)[0] || "/";
  const segments = safePathname.split("/").filter(Boolean);

  if (segments.length === 0) return "";

  const firstSegment = segments[0].toLowerCase();
  if (TENANT_BASE_ROUTES.has(firstSegment)) return "";

  return `/${segments[0]}`;
};

export const getTenantScopedPath = (pathname: string, targetPath: string) => {
  const rawTarget = String(targetPath || "/").trim();
  if (!rawTarget) return "/";
  if (/^https?:\/\//i.test(rawTarget)) return rawTarget;

  const { path, suffix } = splitPathAndSuffix(rawTarget);
  const normalizedPath = (path || "/").startsWith("/") ? (path || "/") : `/${path}`;
  const prefix = getTenantPrefixFromPathname(pathname);

  if (!prefix) {
    return `${normalizedPath}${suffix}`;
  }

  if (normalizedPath === "/") {
    return `${prefix}${suffix}`;
  }

  if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
    return `${normalizedPath}${suffix}`;
  }

  return `${prefix}${normalizedPath}${suffix}`;
};
