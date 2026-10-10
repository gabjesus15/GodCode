"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import clsx from "clsx";

import { brandInitials } from "@/lib/tenant/brand-initials";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import { safeImageSrc } from "../cart/utils/image-src";

import "../../../app/[subdomain]/styles/ProductPhotoFallback.css";

/** Inicial del producto sin foto, con la regla de las iniciales de marca: "Pollo crispy" → "P", "La Especial" → "E". */
export function productInitials(name: string | null | undefined): string {
	return brandInitials(name, { max: 1, fallback: "?" });
}

export type ProductPhotoFallbackProps = {
	/** Nombre del producto: de él sale la inicial. */
	name: string | null | undefined;
	/** Hueco que ocupa (tamaño, forma, posición): lo pone cada sitio. */
	className?: string;
	initialClassName?: string;
};

/**
 * Lo que va en lugar de la foto de un producto sin foto propia (o cuya foto no cargó): su
 * inicial sobre el color del local. Nunca una foto de stock: una pizza sin foto no puede
 * aparecer como un plato de carne. Es decorativa; el nombre ya está en el texto de al lado.
 */
export function ProductPhotoFallback({ name, className, initialClassName }: ProductPhotoFallbackProps) {
	return (
		<span className={clsx("product-photo-fallback", className)} aria-hidden>
			<span className={clsx("product-photo-fallback__initial", initialClassName)}>{productInitials(name)}</span>
		</span>
	);
}

export type ProductThumbProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
	/** URL tal como llega: puede venir vacía, sin resolver o de Cloudinary. */
	src: string | null | undefined;
	name: string | null | undefined;
	/** Vacío por omisión: en las miniaturas el nombre ya está al lado. */
	alt?: string;
	/** Clase del relleno con la inicial; por omisión, la misma de la foto. */
	fallbackClassName?: string;
};

/**
 * Miniatura de producto (carrito, sugerencias, panel en línea): la foto si hay una
 * utilizable y carga; si no, la inicial. Guarda qué URL falló, así una URL nueva se vuelve
 * a intentar sin efecto que reinicie el estado.
 */
export function ProductThumb({
	src,
	name,
	alt = "",
	className,
	fallbackClassName,
	unoptimized,
	...imageProps
}: ProductThumbProps) {
	const photo = safeImageSrc(src);
	const [failedSrc, setFailedSrc] = useState<string | null>(null);

	if (!photo || failedSrc === photo) {
		return <ProductPhotoFallback name={name} className={fallbackClassName ?? className} />;
	}
	return (
		<Image
			{...imageProps}
			src={photo}
			alt={alt}
			className={className}
			unoptimized={unoptimized ?? shouldUnoptimizeImageSrc(photo)}
			onError={() => setFailedSrc(photo)}
		/>
	);
}
