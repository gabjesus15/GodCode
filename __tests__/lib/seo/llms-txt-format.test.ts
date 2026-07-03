import { describe, expect, it } from "vitest";

import { formatLlmsTxtLink } from "@/lib/seo/llms-txt-format";

describe("llms-txt-format", () => {
	it("formats markdown links per llms.txt spec", () => {
		expect(formatLlmsTxtLink("Menú", "https://example.com/menu", "Pedidos online")).toBe(
			"- [Menú](https://example.com/menu): Pedidos online",
		);
		expect(formatLlmsTxtLink("Inicio", "https://example.com/")).toBe(
			"- [Inicio](https://example.com/)",
		);
	});
});
