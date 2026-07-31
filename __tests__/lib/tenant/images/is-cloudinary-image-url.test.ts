import { describe, expect, it } from "vitest";

import { isCloudinaryImageUrl } from "@/lib/tenant/images/is-cloudinary-image-url";

describe("isCloudinaryImageUrl", () => {
	it("detects Cloudinary hosts", () => {
		expect(
			isCloudinaryImageUrl(
				"https://res.cloudinary.com/dzdgrm4ub/image/upload/v1/menu/product.jpg",
			),
		).toBe(true);
	});

	it("ignores empty and non-Cloudinary URLs", () => {
		expect(isCloudinaryImageUrl(null)).toBe(false);
		expect(isCloudinaryImageUrl("")).toBe(false);
		expect(
			isCloudinaryImageUrl(
				"https://supabase.ghamnas.online/storage/v1/object/public/menu/company/product.png",
			),
		).toBe(false);
	});
});
