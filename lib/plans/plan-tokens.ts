/** Token canónico de planes y add-ons: sin tildes, en minúsculas y con `_` como único separador. */
export function normalizePlanToken(input: string | null | undefined): string {
	return String(input ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

/** Copia superficial de un objeto plano (p. ej. `plan.features`); `{}` si llega null, un array o un primitivo. */
export function toPlainRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return { ...(value as Record<string, unknown>) };
}
