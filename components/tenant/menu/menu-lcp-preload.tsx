"use client";

import { useEffect } from "react";
import { isCloudinaryUrl, getCloudinaryOptimizedUrl } from "@/components/tenant/utils/cloudinary";
import type { HeroBanner } from "../home/hero-carousel";

export function MenuLcpPreload({ banners }: { banners: HeroBanner[] }) {
	useEffect(() => {
		const raw = banners[0]?.image_url?.trim();
		if (!raw) return;

		const href = isCloudinaryUrl(raw)
			? getCloudinaryOptimizedUrl(raw, { width: 1200, quality: "auto", crop: "fill" }) || raw
			: raw;

		const existing = document.querySelector('link[data-menu-lcp-preload="1"]');
		if (existing) return;

		const link = document.createElement("link");
		link.rel = "preload";
		link.as = "image";
		link.href = href;
		link.setAttribute("data-menu-lcp-preload", "1");
		document.head.appendChild(link);

		return () => {
			link.remove();
		};
	}, [banners]);

	return null;
}
