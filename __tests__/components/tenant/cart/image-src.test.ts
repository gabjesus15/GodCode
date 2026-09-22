import { describe, expect, it } from "vitest";

import { isRenderableImageSrc, safeImageSrc } from "@/components/tenant/cart/utils/image-src";

describe("safeImageSrc", () => {
	it("keeps what next/image can render", () => {
		expect(safeImageSrc("https://cdn.test/a.png", "/fb.png")).toBe("https://cdn.test/a.png");
		expect(safeImageSrc("/images/a.png", "/fb.png")).toBe("/images/a.png");
		expect(safeImageSrc("blob:http://x/1", "/fb.png")).toBe("blob:http://x/1");
	});

	it("falls back for storage keys, cloudinary and empty values", () => {
		expect(safeImageSrc("3c4e/cart-upsell/x.png", "/fb.png")).toBe("/fb.png");
		expect(safeImageSrc("https://res.cloudinary.com/demo/x.png", "/fb.png")).toBe("/fb.png");
		expect(safeImageSrc("", "/fb.png")).toBe("/fb.png");
		expect(safeImageSrc(null, "/fb.png")).toBe("/fb.png");
		expect(safeImageSrc("//evil.test/x.png", "/fb.png")).toBe("/fb.png");
	});

	it("exposes the renderable check on its own", () => {
		expect(isRenderableImageSrc("data:image/png;base64,AAA")).toBe(true);
		expect(isRenderableImageSrc("javascript:alert(1)")).toBe(false);
	});
});
