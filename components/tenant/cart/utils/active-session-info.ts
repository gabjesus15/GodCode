import type { ActiveSessionInfo, BranchInfo, BusinessInfo } from "../cart-modal-types";

/** Datos de contacto y cobro: la sucursal pisa al negocio campo a campo, sin borrar con vacíos. */
export function mergeActiveSessionInfo(
	businessInfo: BusinessInfo | null | undefined,
	branch: BranchInfo | null | undefined,
): ActiveSessionInfo {
	const info = businessInfo ?? {};
	if (!branch) return info;
	return {
		...info,
		...branch,
		name: branch.name || info.name,
		address: branch.address || info.address,
		phone: branch.phone || info.phone,
		bank_name: branch.bank_name || info.bank_name,
		account_type: branch.account_type || info.account_type,
		account_number: branch.account_number || info.account_number,
		account_rut: branch.account_rut || info.account_rut,
		account_email: branch.account_email || info.account_email,
		account_holder: branch.account_holder || info.account_holder,
	};
}

/** Zona horaria con la que se explica el horario de cierre al cliente. */
export function resolveCheckoutTimeZone(country: string | null | undefined): string {
	const normalized = String(country ?? "").trim();
	return normalized === "VE" || normalized === "Venezuela"
		? "America/Caracas"
		: "America/Santiago";
}
