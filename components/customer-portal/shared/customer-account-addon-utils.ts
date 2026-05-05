export function normalizeAddonIdentity(input: {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  type?: string | null;
}): string {
  return `${String(input.id ?? "").trim().toLowerCase()}|${String(input.slug ?? "").trim().toLowerCase()}|${String(input.type ?? "").trim().toLowerCase()}|${String(input.name ?? "").trim().toLowerCase()}`;
}

export function isSingleInstanceAddon(input: { name?: string | null; slug?: string | null; type?: string | null }): boolean {
  const haystack = `${String(input.name ?? "")} ${String(input.slug ?? "")} ${String(input.type ?? "")}`.toLowerCase();
  if (!haystack) return false;
  return (
    haystack.includes("dominio") ||
    haystack.includes("domain") ||
    haystack.includes("custom_domain") ||
    haystack.includes("custom-domain")
  );
}
