const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_ID_REGEX = /^\d+$/;

/** UUID v1–v5: distingue un producto del catálogo de una línea sintética del carrito (extras). */
export const isUuidLike = (value: string) => UUID_REGEX.test(value);

/** Id de catálogo válido para mandar a la base: UUID o numérico, sin basura. */
const isValidRecordId = (id: unknown) => {
  if (id == null || typeof id !== "string") return false;
  const s = String(id).trim();
  if (s.length === 0 || s.length > 64) return false;
  return UUID_REGEX.test(s) || NUMERIC_ID_REGEX.test(s);
};

export const isValidProductId = isValidRecordId;

export const filterValidProductIds = (ids: unknown[]): string[] => {
	if (!Array.isArray(ids)) return [];
	return ids.filter((id): id is string => isValidProductId(id));
};

export const isValidBranchId = isValidRecordId;
