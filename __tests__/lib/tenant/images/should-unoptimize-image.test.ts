import { describe, expect, it } from "vitest";

import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";

describe("shouldUnoptimizeImageSrc", () => {
	it("keeps blob/data/svg/local emoji hosts unoptimized", () => {
		expect(shouldUnoptimizeImageSrc("blob:http://localhost/x")).toBe(true);
		expect(shouldUnoptimizeImageSrc("data:image/png;base64,abc")).toBe(true);
		expect(shouldUnoptimizeImageSrc("/tenant/logo-placeholder.svg")).toBe(true);
		expect(shouldUnoptimizeImageSrc("https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif")).toBe(true);
	});

	it("optimizes remote storage and unsplash urls", () => {
		expect(
			shouldUnoptimizeImageSrc(
				"https://supabase.ghamnas.online/storage/v1/object/public/menu/company/product.png",
			),
		).toBe(false);
		expect(
			shouldUnoptimizeImageSrc(
				"https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
			),
		).toBe(false);
	});
});
