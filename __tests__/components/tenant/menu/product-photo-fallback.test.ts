import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LazyMotion, domMax } from "framer-motion";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { useProductCardLogic, type ProductCardProduct } from "@/components/tenant/menu/product-card-shared";
import { ProductSheetStage } from "@/components/tenant/menu/product-details-sheet";
import { ProductPhotoFallback, ProductThumb, productInitials } from "@/components/tenant/menu/product-photo-fallback";
import { getMessagesForLocale } from "@/lib/i18n/messages";

const STORAGE_PHOTO = "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/pizza.jpg";

const pizzaWithoutPhoto: ProductCardProduct = {
	id: "pizza-1",
	name: "Pizza Pepperoni",
	price: 8,
	image_url: null,
	sizes: [
		{ id: "s1", name: "Personal", price: 8 },
		{ id: "s2", name: "Mediana", price: 13 },
		{ id: "s3", name: "Familiar", price: 19 },
	],
};

// Los hijos van como tercer argumento de createElement (react/no-children-prop); el tipo del
// proveedor los pide en las props, así que aquí se declaran opcionales.
const IntlProvider = NextIntlClientProvider as ComponentType<
	Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & { children?: ReactNode }
>;

function withProviders(node: ReactNode): string {
	return renderToStaticMarkup(
		createElement(
			IntlProvider,
			{ locale: "es", messages: getMessagesForLocale("es") },
			createElement(LazyMotion, { features: domMax }, node),
		),
	);
}

/** Lo mismo que hace la hoja: la foto del escenario sale de la lógica compartida de la tarjeta. */
function SheetStage({ product, sizeIndex = 0 }: { product: ProductCardProduct; sizeIndex?: number }) {
	const logic = useProductCardLogic(product);
	return createElement(ProductSheetStage, {
		product,
		name: product.name ?? "",
		photoSrc: logic.imageSrc,
		onPhotoError: () => {},
		scale: 0.84,
		selectedSize: product.sizes?.[sizeIndex] ?? null,
		reduced: false,
		lite: false,
	});
}

function LogicProbe({ product }: { product: ProductCardProduct }) {
	const logic = useProductCardLogic(product);
	return createElement("output", { "data-has-photo": String(logic.hasPhoto) }, logic.imageSrc ?? "sin-foto");
}

const renderStage = (product: ProductCardProduct, sizeIndex?: number) =>
	withProviders(createElement(SheetStage, { product, sizeIndex }));

describe("hoja de producto sin foto", () => {
	it("pinta la inicial en el plato, no una foto de stock", () => {
		const html = renderStage(pizzaWithoutPhoto, 1);
		expect(html).not.toContain("images.unsplash.com");
		expect(html).not.toContain("<img");
		expect(html).toContain(
			'<span class="product-photo-fallback pds__fallback" aria-hidden="true"><span class="product-photo-fallback__initial">P</span></span>',
		);
		// Dentro del plato que escala con el tamaño, con la forma de una foto con fondo.
		expect(html).toMatch(
			/<div class="pds__plate"[^>]*><div class="pds__img-wrap"[^>]*><span class="product-photo-fallback pds__fallback"/,
		);
		expect(html).toContain('data-fit="cover"');
		expect(html).toContain(">Mediana<");
	});

	it("una URL legacy de Cloudinary o una clave sin resolver también dan la inicial", () => {
		for (const image_url of ["https://res.cloudinary.com/demo/pizza.jpg", "3c4e/catalog/pizza.png"]) {
			const html = renderStage({ ...pizzaWithoutPhoto, image_url });
			expect(html).not.toContain("<img");
			expect(html).toContain(">P</span>");
		}
	});

	it("con foto propia pinta la foto y no la inicial", () => {
		const html = renderStage({ ...pizzaWithoutPhoto, image_url: STORAGE_PHOTO });
		expect(html).toContain("<img");
		expect(html).toContain('alt="Pizza Pepperoni"');
		expect(html).toContain(encodeURIComponent(STORAGE_PHOTO));
		expect(html).not.toContain("product-photo-fallback");
		expect(html).not.toContain("images.unsplash.com");
	});
});

describe("lógica de la tarjeta", () => {
	const probe = (image_url: string | null) =>
		renderToStaticMarkup(createElement(LogicProbe, { product: { ...pizzaWithoutPhoto, image_url } }));

	it("sin foto utilizable no hay imageSrc (antes era la foto de stock)", () => {
		expect(probe(null)).toBe('<output data-has-photo="false">sin-foto</output>');
		expect(probe("https://res.cloudinary.com/demo/x.jpg")).toBe('<output data-has-photo="false">sin-foto</output>');
		expect(probe("catalog/x.png")).toBe('<output data-has-photo="false">sin-foto</output>');
	});

	it("con foto propia la usa", () => {
		expect(probe(STORAGE_PHOTO)).toBe(`<output data-has-photo="true">${STORAGE_PHOTO}</output>`);
	});
});

describe("ProductPhotoFallback y ProductThumb", () => {
	it("la inicial sigue la regla de las iniciales de marca", () => {
		expect(productInitials("Pollo crispy")).toBe("P");
		expect(productInitials("La Especial")).toBe("E");
		expect(productInitials("  ")).toBe("?");
	});

	it("el relleno es decorativo y lleva las clases del sitio que lo usa", () => {
		const html = renderToStaticMarkup(
			createElement(ProductPhotoFallback, {
				name: "Bebida de la casa",
				className: "vitrina-photo fcard-photo fcard-photo--empty",
				initialClassName: "fcard-photo__initials",
			}),
		);
		expect(html).toBe(
			'<span class="product-photo-fallback vitrina-photo fcard-photo fcard-photo--empty" aria-hidden="true"><span class="product-photo-fallback__initial fcard-photo__initials">B</span></span>',
		);
	});

	it("la miniatura cae a la inicial sin foto válida y pinta la foto si la hay", () => {
		const thumb = (src: string | null) =>
			renderToStaticMarkup(
				createElement(ProductThumb, {
					src,
					name: "Coca-Cola",
					width: 44,
					height: 44,
					className: "cart-pick__img",
					fallbackClassName: "cart-pick__initial",
				}),
			);
		for (const src of [null, "", "https://res.cloudinary.com/demo/x.png", "x/y.png"]) {
			const html = thumb(src);
			expect(html).not.toContain("<img");
			expect(html).toContain('class="product-photo-fallback cart-pick__initial"');
			expect(html).toContain(">C</span>");
		}
		const withPhoto = thumb(STORAGE_PHOTO);
		expect(withPhoto).toContain("<img");
		expect(withPhoto).toContain('class="cart-pick__img"');
		expect(withPhoto).not.toContain("product-photo-fallback");
	});
});
