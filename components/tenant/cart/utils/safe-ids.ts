const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_ID_REGEX = /^\d+$/;

export const isValidProductId = (id: unknown) => {
  if (id == null || typeof id !== "string") return false;
  const s = String(id).trim();
  if (s.length === 0 || s.length > 64) return false;
  return UUID_REGEX.test(s) || NUMERIC_ID_REGEX.test(s);
};

export const filterValidProductIds = (ids: unknown[]) => {
  if (!Array.isArray(ids)) return [];
  return ids.filter(Boolean).filter(isValidProductId);
};

export const isValidBranchId = (id: unknown) => {
  if (id == null || typeof id !== "string") return false;
  const s = String(id).trim();
  if (s.length === 0 || s.length > 64) return false;
  return UUID_REGEX.test(s) || NUMERIC_ID_REGEX.test(s);
};
