import { describe, expect, it } from "vitest";

import { isRenderableImageSrc, safeImageSrc } from "@/components/tenant/cart/utils/image-src";

describe("safeImageSrc", () => {
	it("keeps what next/image can render", () => {
		expect(safeImageSrc("https://cdn.test/a.png")).toBe("https://cdn.test/a.png");
		expect(safeImageSrc("  /images/a.png ")).toBe("/images/a.png");
		expect(safeImageSrc("blob:http://x/1")).toBe("blob:http://x/1");
	});

	it("returns null (no stock photo) for storage keys, cloudinary and empty values", () => {
		expect(safeImageSrc("3c4e/cart-upsell/x.png")).toBeNull();
		expect(safeImageSrc("https://res.cloudinary.com/demo/x.png")).toBeNull();
		expect(safeImageSrc("")).toBeNull();
		expect(safeImageSrc(null)).toBeNull();
		expect(safeImageSrc(undefined)).toBeNull();
		expect(safeImageSrc("//evil.test/x.png")).toBeNull();
	});

	it("exposes the renderable check on its own", () => {
		expect(isRenderableImageSrc("data:image/png;base64,AAA")).toBe(true);
		expect(isRenderableImageSrc("javascript:alert(1)")).toBe(false);
	});
});
