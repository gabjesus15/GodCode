import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import CartContext, { type CartContextType } from "@/components/tenant/cart/cart-context";
import type { CartLineItem } from "@/components/tenant/cart/cart-modal-types";
import { CartEnhanceCatalogGlyph } from "@/components/tenant/cart/views/cart-enhance-catalog-glyph";
import { CartLine } from "@/components/tenant/cart/views/cart-line";
import { getMessagesForLocale } from "@/lib/i18n/messages";

const STORAGE_PHOTO = "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/pizza.jpg";

// CartMoney solo lee la moneda y la tasa del contexto del carrito.
const cartContext = { currency: "CLP", exchangeRate: null } as unknown as CartContextType;
const noop = () => {};

// Los hijos van como tercer argumento de createElement (react/no-children-prop); el tipo del
// proveedor los pide en las props, así que aquí se declaran opcionales.
const IntlProvider = NextIntlClientProvider as ComponentType<
	Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & { children?: ReactNode }
>;

function render(node: ReactNode): string {
	return renderToStaticMarkup(
		createElement(
			IntlProvider,
			{ locale: "es", messages: getMessagesForLocale("es") },
			createElement(CartContext.Provider, { value: cartContext }, node),
		),
	);
}

const renderLine = (item: CartLineItem) =>
	render(
		createElement(
			"ul",
			null,
			createElement(CartLine, {
				item,
				unitPrice: 9990,
				onAdd: noop,
				onDecrease: noop,
				onRemove: noop,
				onNoteChange: noop,
			}),
		),
	);

const pizza: CartLineItem = { id: "pizza-1", name: "Pizza Napolitana", quantity: 2, price: 9990, image_url: null };

describe("línea del carrito", () => {
	it("sin foto muestra la inicial del producto, no una foto de stock", () => {
		const html = renderLine(pizza);
		expect(html).not.toContain("images.unsplash.com");
		expect(html).not.toContain("<img");
		expect(html).toContain(
			'<span class="product-photo-fallback cart-line__media cart-line__media--initial" aria-hidden="true"><span class="product-photo-fallback__initial">P</span></span>',
		);
		expect(html).toContain(">Pizza Napolitana</h3>");
	});

	it("una foto que no se puede pintar (Cloudinary, clave sin resolver) también da la inicial", () => {
		for (const image_url of ["https://res.cloudinary.com/demo/pizza.jpg", "3c4e/catalog/pizza.png"]) {
			const html = renderLine({ ...pizza, image_url });
			expect(html).not.toContain("<img");
			expect(html).toContain(">P</span>");
		}
	});

	it("con foto propia la pinta como miniatura decorativa", () => {
		const html = renderLine({ ...pizza, image_url: STORAGE_PHOTO });
		expect(html).toContain('<img alt=""');
		expect(html).toContain('class="cart-line__media"');
		expect(html).toContain(encodeURIComponent(STORAGE_PHOTO));
		expect(html).not.toContain("product-photo-fallback");
	});

	it("sin nombre, la inicial sale del nombre de respaldo que se muestra", () => {
		const html = renderLine({ ...pizza, name: null });
		expect(html).toContain(">Producto</h3>");
		expect(html).toContain('<span class="product-photo-fallback__initial">P</span>');
	});

	it("la bebida sugerida conserva su icono de vaso", () => {
		const html = renderLine({ id: "upsell_beverage_b1", name: "Coca-Cola", quantity: 1, price: 1500, image_url: null });
		expect(html).toContain("cart-line__media--glyph");
		expect(html).not.toContain("product-photo-fallback");
	});
});

describe("sugerencias de bebidas y extras", () => {
	it("sin foto muestran la inicial del ítem, no una foto de stock", () => {
		const html = render(createElement(CartEnhanceCatalogGlyph, { imageUrl: null, name: "Papas fritas" }));
		expect(html).not.toContain("<img");
		expect(html).not.toContain("images.unsplash.com");
		expect(html).toContain('class="product-photo-fallback cart-pick__initial"');
		expect(html).toContain('<span class="product-photo-fallback__initial">P</span>');
	});

	it("con foto la pintan", () => {
		const html = render(createElement(CartEnhanceCatalogGlyph, { imageUrl: STORAGE_PHOTO, name: "Papas fritas" }));
		expect(html).toContain('class="cart-pick__img"');
		expect(html).not.toContain("product-photo-fallback");
	});
});
