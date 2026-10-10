"use client";

import { ProductThumb } from "../../menu/product-photo-fallback";

/**
 * Miniatura de una bebida o extra del catálogo: su foto si tiene una válida y carga; si no,
 * su inicial sobre el color del local (no una foto de stock de otra bebida u otro plato).
 */
export function CartEnhanceCatalogGlyph({
	imageUrl,
	name,
}: {
	imageUrl: string | null | undefined;
	name: string;
}) {
	return (
		<span className="cart-pick__glyph" aria-hidden>
			<ProductThumb
				src={imageUrl}
				name={name}
				width={44}
				height={44}
				quality={70}
				className="cart-pick__img"
				fallbackClassName="cart-pick__initial"
			/>
		</span>
	);
}
