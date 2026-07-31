import { describe, expect, it } from "vitest";

import { mergePaymentJsonField } from "@/lib/payments/merge-payment-json-field";

describe("mergePaymentJsonField", () => {
	it("keeps existing secrets when incoming is empty", () => {
		const existing = JSON.stringify({ apiKey: "sk_live_x", secret: "sec" });
		expect(mergePaymentJsonField(null, existing)).toBe(existing);
		expect(mergePaymentJsonField({}, existing)).toBe(existing);
		expect(mergePaymentJsonField({ apiKey: "", secret: "" }, existing)).toBe(existing);
	});

	it("writes incoming when it has values", () => {
		expect(mergePaymentJsonField({ apiKey: "new" }, { apiKey: "old" })).toBe(
			JSON.stringify({ apiKey: "new" }),
		);
	});
});
