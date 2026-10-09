import { normalizeCountryCode } from "./country-registry";

/**
 * Único criterio de «es Venezuela» de la app: el país por código («VE», «ve») o por
 * nombre («Venezuela», «República Bolivariana de Venezuela»), el mismo que aplica el SQL
 * (`upper(btrim(country)) in ('VE', 'VENEZUELA')`). Antes había ocho comprobaciones
 * repartidas por carrito, menú, asistente, súper admin y pago del alta, cada una con su
 * propia regla; una sucursal guardada como «venezuela» pasaba unas y fallaba otras.
 */
export function isVenezuelaCountry(value: string | null | undefined): boolean {
	if (!value) return false;
	if (normalizeCountryCode(value) === "VE") return true;
	return value.toLowerCase().includes("venezuela");
}

/** La moneda local de Venezuela. Los precios del catálogo siguen en dólares. */
export function isVenezuelaCurrency(value: string | null | undefined): boolean {
	return String(value ?? "").trim().toUpperCase() === "VES";
}
