/**
 * Comprobantes de pago en el bucket privado `receipts`.
 *
 * Antes se subían al bucket público `menu` y cualquiera con el enlace (que viaja por
 * correo, capturas y el historial del navegador) veía datos bancarios del cliente.
 * Ahora el archivo es privado y lo que se guarda en la base es un enlace a nuestra
 * propia ruta (`/api/storage/receipt?path=…`): esa ruta autoriza al que lo abre y
 * recién ahí firma una URL de corta vida. Así los `<a href>` existentes del portal y
 * del super admin siguen funcionando sin firmar nada en el navegador.
 */

export const PRIVATE_RECEIPTS_BUCKET = "receipts";
export const PRIVATE_RECEIPT_ROUTE = "/api/storage/receipt";

/** Vida de la URL firmada a la que redirige la ruta: solo para abrirla en el acto. */
export const PRIVATE_RECEIPT_SIGNED_URL_TTL = 60 * 5;

/**
 * Raíz `platform/`: el Panel organiza este bucket por `companyId/…` y sus políticas
 * miran esa primera carpeta; lo de la plataforma queda aparte para no mezclarse.
 */
const PAYMENT_REFERENCE_PATH =
	/^platform\/payment-reference\/([a-zA-Z0-9][a-zA-Z0-9_-]*)\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
const STOREFRONT_RECEIPT_PATH = /^platform\/storefront-receipts\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
const SAFE_COMPANY_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export function paymentReferencePath(companyId: string, fileId: string, extension: string): string | null {
	const company = String(companyId ?? "").trim();
	if (!SAFE_COMPANY_ID.test(company)) return null;
	const path = `platform/payment-reference/${company}/${fileId}.${extension}`;
	return PAYMENT_REFERENCE_PATH.test(path) ? path : null;
}

export function storefrontReceiptPath(fileId: string, extension: string): string | null {
	const path = `platform/storefront-receipts/${fileId}.${extension}`;
	return STOREFRONT_RECEIPT_PATH.test(path) ? path : null;
}

export function isPrivateReceiptPath(path: string | null | undefined): boolean {
	const value = String(path ?? "");
	return PAYMENT_REFERENCE_PATH.test(value) || STOREFRONT_RECEIPT_PATH.test(value);
}

/** Empresa dueña de un comprobante de pago del portal, o null si la ruta no es de ese tipo. */
export function paymentReferenceCompanyId(path: string | null | undefined): string | null {
	const match = PAYMENT_REFERENCE_PATH.exec(String(path ?? ""));
	return match ? match[1] : null;
}

/** Enlace estable que se guarda en la base (relativo: lo abre el mismo origen de la app). */
export function privateReceiptHref(path: string): string {
	return `${PRIVATE_RECEIPT_ROUTE}?path=${encodeURIComponent(path)}`;
}

/** Ruta del bucket a partir del enlace guardado; null si no es un enlace nuestro válido. */
export function parsePrivateReceiptHref(value: string | null | undefined): string | null {
	const raw = String(value ?? "").trim();
	if (!raw.startsWith(`${PRIVATE_RECEIPT_ROUTE}?`)) return null;
	const params = new URLSearchParams(raw.slice(PRIVATE_RECEIPT_ROUTE.length + 1));
	const keys = [...params.keys()];
	if (keys.length !== 1 || keys[0] !== "path") return null;
	const path = params.get("path");
	return path && isPrivateReceiptPath(path) ? path : null;
}
