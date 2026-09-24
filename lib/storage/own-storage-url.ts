/**
 * ¿La URL apunta a un archivo de nuestro Supabase Storage?
 *
 * Los comprobantes de pago llegan como URL desde el navegador y el super admin los abre
 * con "Ver comprobante": sin esta comprobación se podía guardar cualquier enlace.
 */
export function isOwnStorageUrl(value: string | null | undefined): boolean {
	const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
	if (!value || !base) return false;
	try {
		const url = new URL(value);
		const origin = new URL(base);
		return (
			url.protocol === origin.protocol &&
			url.host === origin.host &&
			url.pathname.startsWith(`${origin.pathname.replace(/\/$/, "")}/storage/v1/object/`)
		);
	} catch {
		return false;
	}
}
