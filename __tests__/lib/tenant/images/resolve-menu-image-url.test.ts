import { describe, expect, it } from "vitest";

import { resolveMenuImageUrl } from "@/lib/tenant/images/resolve-menu-image-url";

const SUPABASE_URL = "https://supabase.ghamnas.online";

describe("resolveMenuImageUrl", () => {
	it("builds a public menu Storage URL from a relative object path", () => {
		expect(
			resolveMenuImageUrl(
				"8530d8ba-4058-41ca-9544-266cfd43bd52/catalog/products/product image.png",
				SUPABASE_URL,
			),
		).toBe(
			"https://supabase.ghamnas.online/storage/v1/object/public/menu/8530d8ba-4058-41ca-9544-266cfd43bd52/catalog/products/product%20image.png",
		);
	});

	it("keeps an existing absolute URL unchanged", () => {
		const url = "https://cdn.example.com/menu/product.png";
		expect(resolveMenuImageUrl(url, SUPABASE_URL)).toBe(url);
	});

	it("rejects a Cloudinary URL so the menu uses its fallback", () => {
		const url = "https://res.cloudinary.com/demo/image/upload/menu/product.png";
		expect(resolveMenuImageUrl(url, SUPABASE_URL)).toBeNull();
	});

	it("keeps an existing Supabase public URL unchanged", () => {
		const url = `${SUPABASE_URL}/storage/v1/object/public/menu/company/product.png`;
		expect(resolveMenuImageUrl(url, SUPABASE_URL)).toBe(url);
	});

	it.each([null, undefined, "", "   ", "data:image/png;base64,abc", "../secret.png"])(
		"returns null for an empty or invalid value: %s",
		(value) => {
			expect(resolveMenuImageUrl(value, SUPABASE_URL)).toBeNull();
		},
	);

	it("returns null when the Supabase base URL is missing or invalid", () => {
		expect(resolveMenuImageUrl("company/product.png", undefined)).toBeNull();
		expect(resolveMenuImageUrl("company/product.png", "not-a-url")).toBeNull();
	});
});
