/**
 * Comprobantes de pago en el bucket privado `receipts`.
 *
 * Antes se subían al bucket público `menu` y cualquiera con el enlace (que viaja por
 * correo, capturas y el historial del navegador) veía datos bancarios del cliente.
 * Ahora el archivo es privado. Hay dos tipos:
 *
 * - Comprobantes del portal (`platform/payment-reference/{empresa}/…`): en la base se
 *   guarda un enlace a nuestra propia ruta (`/api/storage/receipt?path=…`), que
 *   autoriza al que lo abre y recién ahí firma una URL de corta vida. Así los
 *   `<a href>` existentes del portal y del super admin siguen funcionando sin firmar
 *   nada en el navegador.
 * - Comprobantes de pedidos del menú (`{empresa}/orders/{sucursal}/receipts/…`): la
 *   ruta del objeto se guarda en `orders.payment_ref`, que es donde la caja (Panel)
 *   busca el comprobante y lo abre con su propia sesión. Es el mismo árbol por empresa
 *   que usa el Panel para los comprobantes que sube la propia caja, así sus políticas
 *   de lectura (primera carpeta = empresa) lo cubren sin cambios.
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
const SAFE_COMPANY_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID}$`, "i");
/** `{empresa}/orders/{sucursal}/receipts/{año}/{mes}/{pedido}/{archivo}.{ext}` */
const ORDER_RECEIPT_PATH = new RegExp(
	`^(${UUID})/orders/${UUID}/receipts/\\d{4}/\\d{2}/\\d+/${UUID}\\.(?:jpg|png|webp)$`,
	"i",
);

export function paymentReferencePath(companyId: string, fileId: string, extension: string): string | null {
	const company = String(companyId ?? "").trim();
	if (!SAFE_COMPANY_ID.test(company)) return null;
	const path = `platform/payment-reference/${company}/${fileId}.${extension}`;
	return PAYMENT_REFERENCE_PATH.test(path) ? path : null;
}

/** Rutas que abre `/api/storage/receipt`: solo los comprobantes del portal. */
export function isPrivateReceiptPath(path: string | null | undefined): boolean {
	return PAYMENT_REFERENCE_PATH.test(String(path ?? ""));
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

/**
 * Ruta del comprobante de un pedido del menú. Empresa y sucursal son uuid y el pedido
 * un entero: cualquier otra cosa devuelve null, así nada ajeno entra en la ruta.
 */
export function orderReceiptPath(params: {
	companyId: string;
	branchId: string;
	orderId: string | number;
	fileId: string;
	extension: string;
	now?: Date;
}): string | null {
	const company = String(params.companyId ?? "").trim();
	const branch = String(params.branchId ?? "").trim();
	const order = String(params.orderId ?? "").trim();
	if (!UUID_RE.test(company) || !UUID_RE.test(branch) || !/^\d+$/.test(order)) return null;
	const now = params.now ?? new Date();
	const year = String(now.getUTCFullYear());
	const month = String(now.getUTCMonth() + 1).padStart(2, "0");
	const path = `${company}/orders/${branch}/receipts/${year}/${month}/${order}/${params.fileId}.${params.extension}`;
	return ORDER_RECEIPT_PATH.test(path) ? path : null;
}

/** ¿`payment_ref` ya es un comprobante de pedido de esa empresa en este bucket? */
export function isOrderReceiptPath(path: string | null | undefined, companyId: string): boolean {
	const match = ORDER_RECEIPT_PATH.exec(String(path ?? "").trim());
	return Boolean(match && match[1].toLowerCase() === String(companyId ?? "").trim().toLowerCase());
}
