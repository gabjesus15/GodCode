import type { Metadata } from "next";
import { notFound } from "next/navigation";

import "../../[subdomain]/styles/TenantUiPrimitives.css";
import "../../[subdomain]/styles/index.css";
import "../../[subdomain]/tenant-base.css";

import { ProductSheetPlayground } from "./playground";

export const metadata: Metadata = {
	title: "Hoja de producto · laboratorio",
	robots: { index: false, follow: false },
};

/**
 * Laboratorio de la hoja de producto: solo en desarrollo. Abre la hoja con productos de
 * ejemplo (tamaños, variantes, oferta, sin opciones) en claro/oscuro y con el acento
 * que se quiera, sin tocar la base ni levantar un menú real.
 */
export default function ProductSheetLabPage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <ProductSheetPlayground />;
}
