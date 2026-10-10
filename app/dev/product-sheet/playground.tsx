"use client";

import { useState, type CSSProperties } from "react";

import { ProductDetailsSheet } from "@/components/tenant/menu/product-details-sheet";
import type { ProductCardProduct } from "@/components/tenant/menu/product-card-shared";
import { useCartStore } from "@/components/tenant/cart/cart-store";

const RICA = "https://supabase.ghamnas.online/storage/v1/object/public/menu/3c4e3b36-ce1d-4e8d-8c29-fda7eb990aec/catalog/products/drafts";

/** Productos de muestra: recortes PNG reales de Rica Pizza, una foto JPG para el caso "con fondo" y uno sin foto (la inicial). */
const FIXTURES: Record<string, ProductCardProduct> = {
	pizza: {
		id: "11111111-1111-4111-8111-111111111111",
		name: "Margarita Artesanal",
		description:
			"Salsa napolitana de la casa, abundante queso mozzarella, albahaca fresca y un hilo de aceite de oliva.",
		image_url: `${RICA}/17a378f6-307b-4932-938d-3b4a4bfb3b27.png`,
		price: 7,
		sizes: [
			{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", name: "Personal", price: 7 },
			{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", name: "Mediana", price: 12 },
			{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", name: "Familiar", price: 18 },
		],
		variants: [
			{
				name: "Masa",
				options: [
					{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", name: "Tradicional", priceDelta: 0, imageUrl: null },
					{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2", name: "Fina", priceDelta: 0, imageUrl: null },
					{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3", name: "Borde de queso", priceDelta: 2, imageUrl: null },
				],
			},
		],
	},
	burger: {
		id: "22222222-2222-4222-8222-222222222222",
		name: "Hamburguesa Americana",
		description: "Pan brioche, lechuga, tomate, cebolla morada, queso cheddar y salsa de la casa.",
		image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80",
		price: 11,
		has_discount: true,
		discount_price: 9,
		variants: [
			{
				name: "Proteína",
				options: [
					{ id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1", name: "Carne", priceDelta: 0, imageUrl: null },
					{
						id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
						name: "Pollo",
						priceDelta: 0,
						imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=900&q=80",
					},
					{ id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3", name: "Mixta", priceDelta: 1.5, imageUrl: null },
				],
			},
			{
				name: "Punto",
				options: [
					{ id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1", name: "Término medio", priceDelta: 0, imageUrl: null },
					{ id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2", name: "Bien cocida", priceDelta: 0, imageUrl: null },
				],
			},
		],
	},
	sushi: {
		id: "33333333-3333-4333-8333-333333333333",
		name: "Tabla Oishi",
		description: "Selección del chef con salmón, atún y kanikama. Viene con soya, wasabi y jengibre.",
		image_url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=900&q=80",
		price: 14990,
		sizes: [
			{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1", name: "20 piezas", price: 14990 },
			{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2", name: "30 piezas", price: 20990 },
			{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3", name: "40 piezas", price: 26990 },
			{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4", name: "60 piezas", price: 38990 },
		],
	},
	simple: {
		id: "44444444-4444-4444-8444-444444444444",
		name: "Caprese Especial",
		description: "Salsa napolitana, mozzarella fresca, rodajas de tomate maduro, pesto y reducción de balsámico.",
		image_url: `${RICA}/95d63b01-d528-425a-95ba-f8950ce8eb97.png`,
		price: 18,
		is_special: true,
	},
	nophoto: {
		id: "55555555-5555-4555-8555-555555555555",
		name: "Pizza Pepperoni",
		description: "Salsa de tomate, mozzarella y pepperoni en rodajas.",
		image_url: null,
		price: 8,
		sizes: [
			{ id: "ffffffff-ffff-4fff-8fff-fffffffffff1", name: "Personal", price: 8 },
			{ id: "ffffffff-ffff-4fff-8fff-fffffffffff2", name: "Mediana", price: 13 },
			{ id: "ffffffff-ffff-4fff-8fff-fffffffffff3", name: "Familiar", price: 19 },
		],
	},
};

const MARKETS = {
	VE: { country: "VE", currency: "USD", exchangeRate: 36.5 },
	CL: { country: "CL", currency: "CLP", exchangeRate: null },
} as const;

export function ProductSheetPlayground() {
	const [openKey, setOpenKey] = useState<keyof typeof FIXTURES | null>(null);
	const [scheme, setScheme] = useState<"dark" | "light">("dark");
	const [accent, setAccent] = useState("#e63946");
	const [marketKey, setMarketKey] = useState<keyof typeof MARKETS>("VE");
	const cart = useCartStore((state) => state.cart);
	const clearCart = useCartStore((state) => state.clearCart);
	const market = marketKey === "CL" ? MARKETS.CL : MARKETS.VE;
	const product = openKey ? FIXTURES[openKey] : null;
	// En el laboratorio no hay sushi en dólares: la tabla usa pesos.
	const effectiveMarket = openKey === "sushi" ? MARKETS.CL : market;

	return (
		<div
			className="tenant-theme-vars"
			data-scheme={scheme}
			style={
				{
					"--accent-primary": accent,
					minHeight: "100dvh",
					background: "var(--menu-canvas)",
					color: "var(--menu-fg)",
					fontFamily: "Montserrat, system-ui, sans-serif",
					padding: "24px 20px 48px",
				} as CSSProperties
			}
		>
			<div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 18 }}>
				<h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 650, letterSpacing: "-0.015em" }}>
					Hoja de producto · laboratorio
				</h1>
				<p style={{ margin: 0, color: "var(--menu-fg-2)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
					Solo desarrollo. Abre cada caso y prueba tamaños, variantes, cantidad y el estado «Agregado».
				</p>

				<div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
					<label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: "0.875rem" }}>
						Esquema
						<select value={scheme} onChange={(event) => setScheme(event.target.value as "dark" | "light")}>
							<option value="dark">Oscuro</option>
							<option value="light">Claro</option>
						</select>
					</label>
					<label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: "0.875rem" }}>
						Mercado
						<select value={marketKey} onChange={(event) => setMarketKey(event.target.value as keyof typeof MARKETS)}>
							<option value="VE">Venezuela (USD + Bs.)</option>
							<option value="CL">Chile (CLP)</option>
						</select>
					</label>
					<label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: "0.875rem" }}>
						Acento
						<input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
					</label>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
					{(Object.keys(FIXTURES) as Array<keyof typeof FIXTURES>).map((key) => (
						<button
							key={key}
							type="button"
							onClick={() => setOpenKey(key)}
							style={{
								padding: "14px 16px",
								borderRadius: 14,
								border: "1px solid var(--menu-line-strong)",
								background: "var(--menu-surface)",
								color: "var(--menu-fg)",
								font: "inherit",
								fontWeight: 600,
								textAlign: "left",
								cursor: "pointer",
							}}
						>
							{FIXTURES[key].name}
							<span style={{ display: "block", marginTop: 4, fontSize: "0.8rem", color: "var(--menu-fg-3)", fontWeight: 500 }}>
								{key === "pizza" && "3 tamaños · 1 grupo de variantes · PNG recortado"}
								{key === "burger" && "oferta · 2 grupos · foto por variante · JPG"}
								{key === "sushi" && "4 tamaños · sin variantes · JPG"}
								{key === "simple" && "sin opciones · especial"}
								{key === "nophoto" && "sin foto · 3 tamaños · la inicial crece con el plato"}
							</span>
						</button>
					))}
				</div>

				<div style={{ fontSize: "0.875rem", color: "var(--menu-fg-2)", display: "flex", gap: 12, alignItems: "center" }}>
					<span>
						Carrito: {cart.length} línea{cart.length === 1 ? "" : "s"}
						{cart.length > 0 ? ` · ${cart.map((line) => `${line.quantity}× ${line.name}`).join(", ")}` : ""}
					</span>
					{cart.length > 0 ? (
						<button type="button" onClick={clearCart} style={{ font: "inherit", cursor: "pointer" }}>
							Vaciar
						</button>
					) : null}
				</div>
			</div>

			<div id="modal-root" />

			{product ? (
				<ProductDetailsSheet
					key={product.id}
					isOpen
					onClose={() => setOpenKey(null)}
					product={product}
					country={effectiveMarket.country}
					currency={effectiveMarket.currency}
					exchangeRate={effectiveMarket.exchangeRate}
					onlineOrderingEnabled
				/>
			) : null}
		</div>
	);
}
