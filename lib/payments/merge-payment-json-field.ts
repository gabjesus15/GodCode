function isEmptyPaymentConfig(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed || trimmed === "{}" || trimmed === "null") return true;
		try {
			return isEmptyPaymentConfig(JSON.parse(trimmed));
		} catch {
			return false;
		}
	}
	if (typeof value !== "object" || Array.isArray(value)) return false;
	return Object.values(value as Record<string, unknown>).every(
		(v) => v == null || String(v).trim() === "",
	);
}

function serializePaymentField(value: unknown): string | null {
	if (value == null) return null;
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed || null;
	}
	return JSON.stringify(value);
}

/** Preserve existing secrets when the form submits an empty payment config. */
export function mergePaymentJsonField(
	incoming: unknown,
	existing: unknown,
): string | null {
	if (isEmptyPaymentConfig(incoming)) {
		if (isEmptyPaymentConfig(existing)) return null;
		return serializePaymentField(existing);
	}
	return serializePaymentField(incoming);
}
