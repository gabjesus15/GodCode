"use client";

import { useState } from "react";
import Image from "next/image";

import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import { safeImageSrc } from "../utils/image-src";

/** Miniatura de una bebida o extra del catálogo, con respaldo si la imagen falla o no es válida. */
export function CartEnhanceCatalogGlyph({
	imageUrl,
	fallbackSrc,
}: {
	imageUrl: string | null | undefined;
	fallbackSrc: string;
}) {
	const primary = safeImageSrc(imageUrl, fallbackSrc);
	const [failed, setFailed] = useState(false);
	const src = failed ? fallbackSrc : primary;

	return (
		<span className="cart-pick__glyph" aria-hidden>
			<Image
				key={primary}
				src={src}
				alt=""
				width={44}
				height={44}
				quality={70}
				unoptimized={shouldUnoptimizeImageSrc(src)}
				className="cart-pick__img"
				onError={() => setFailed(true)}
			/>
		</span>
	);
}
